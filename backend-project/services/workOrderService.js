const WorkOrder = require('../models/WorkOrder');
const InventoryService = require('./inventoryService');
const mongoose = require('mongoose');

class WorkOrderService {
  /**
   * Create a new work order
   */
  static async createWorkOrder(tenantId, userId, data) {
    const lastOrder = await WorkOrder.findOne({ tenantId }).sort({ createdAt: -1 });
    const nextNumber = lastOrder ? parseInt(lastOrder.orderNumber.split('-')[1]) + 1 : 1001;
    
    const workOrder = new WorkOrder({
      ...data,
      tenantId,
      createdBy: userId,
      orderNumber: `WO-${nextNumber}`
    });
    
    workOrder.calculateTotals();
    return await workOrder.save();
  }

  /**
   * Update work order status and handle inventory consumption
   */
  static async updateStatus(tenantId, userId, workOrderId, newStatus) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wo = await WorkOrder.findOne({ _id: workOrderId, tenantId }).session(session);
      if (!wo) throw new Error('Work order not found');

      // Logic: Transitioning to IN_PROGRESS or COMPLETED
      if (newStatus === 'IN_PROGRESS' && wo.status === 'PENDING') {
        wo.startedAt = new Date();
      }

      // If completing, we consume inventory if not already done
      if (newStatus === 'COMPLETED' && wo.status !== 'COMPLETED') {
        for (let partItem of wo.parts) {
          if (!partItem.stockMovementId) {
            const movement = await InventoryService.recordMovement({
              tenantId,
              sparePartId: partItem.sparePartId,
              type: 'OUT',
              quantity: -partItem.quantity,
              reason: 'WORK_ORDER',
              performedByUserId: userId,
              workOrderId: wo._id,
              notes: `Consumed for WO: ${wo.orderNumber}`
            });
            partItem.stockMovementId = movement._id;
          }
        }
        wo.completedAt = new Date();
      }

      wo.status = newStatus;
      await wo.save({ session });
      await session.commitTransaction();
      return wo;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = WorkOrderService;
