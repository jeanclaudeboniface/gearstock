const mongoose = require('mongoose');
const StockMovement = require('../models/StockMovement');
const SparePart = require('../models/SparePart');

class InventoryService {
  
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

  static async recordMovement({
    tenantId,
    sparePartId,
    type,
    quantity, 
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
      
      const part = await SparePart.findOne({ _id: sparePartId, tenantId }).session(session);
      if (!part) throw new Error('Spare part not found or access denied');

      const currentBalance = await this.getPartBalance(tenantId, sparePartId);
      if (type === 'OUT' && Math.abs(quantity) > currentBalance) {
        throw new Error(`Insufficient stock. Available: ${currentBalance}, Requested: ${Math.abs(quantity)}`);
      }

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
