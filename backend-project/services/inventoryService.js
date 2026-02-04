const mongoose = require('mongoose');
const StockMovement = require('../models/StockMovement');
const SparePart = require('../models/SparePart');

/**
 * Service to handle all inventory logic.
 * Ensures data integrity and tenant isolation.
 */
class InventoryService {
  /**
   * Calculate current stock for a part
   */
  static async getPartBalance(tenantId, sparePartId) {
    const result = await StockMovement.aggregate([
      { $match: { 
          tenantId: new mongoose.Types.ObjectId(tenantId), 
          sparePartId: new mongoose.Types.ObjectId(sparePartId) 
      } },
      { $group: { _id: null, balance: { $sum: '$quantity' } } }
    ]);
    return result.length > 0 ? result[0].balance : 0;
  }

  /**
   * Perform a stock movement
   */
  static async recordMovement({
    tenantId,
    sparePartId,
    type,
    quantity, // Positive for IN/ADJUST+, Negative for OUT/ADJUST-
    reason,
    performedByUserId,
    unitCost = 0,
    workOrderId = null,
    notes = '',
    referenceNumber = ''
  }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Validate Part exists and belongs to tenant
      const part = await SparePart.findOne({ _id: sparePartId, tenantId }).session(session);
      if (!part) throw new Error('Spare part not found or access denied');

      // 2. If OUT, check availability
      const currentBalance = await this.getPartBalance(tenantId, sparePartId);
      if (type === 'OUT' && Math.abs(quantity) > currentBalance) {
        throw new Error(`Insufficient stock. Available: ${currentBalance}, Requested: ${Math.abs(quantity)}`);
      }

      // 3. Record Movement
      const movement = await StockMovement.create([{
        tenantId,
        sparePartId,
        type,
        quantity,
        reason,
        performedByUserId,
        unitCost,
        workOrderId,
        notes,
        referenceNumber,
        balanceAfter: currentBalance + quantity
      }], { session });

      await session.commitTransaction();
      return movement[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get Inventory Status Report
   */
  static async getInventoryStatus(tenantId) {
    return await SparePart.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'ACTIVE' } },
      {
        $lookup: {
          from: 'stockmovements',
          localField: '_id',
          foreignField: 'sparePartId',
          as: 'movements'
        }
      },
      {
        $project: {
          name: 1,
          sku: 1,
          category: 1,
          unit_price: 1,
          lowStockThreshold: 1,
          currentQuantity: { $sum: '$movements.quantity' }
        }
      }
    ]);
  }
}

module.exports = InventoryService;
