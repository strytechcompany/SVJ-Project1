// controllers/genericController.js

const { applyOptionalLimit } = require('../utils/queryPerformance');

const createController = (Model) => {
    return {
        getAll: async (req, res) => {
            try {
                const itemsQuery = Model.find().sort({ createdAt: -1 }).lean();
                applyOptionalLimit(itemsQuery, req.query.limit);
                const items = await itemsQuery;
                res.status(200).json(items);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        },

        getOne: async (req, res) => {
            try {
                const item = await Model.findById(req.params.id);
                if (!item) return res.status(404).json({ error: 'Item not found' });
                res.status(200).json(item);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        },

        create: async (req, res) => {
            try {
                const item = new Model(req.body);
                const saved = await item.save();
                res.status(201).json(saved);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        },

        update: async (req, res) => {
            try {
                const updated = await Model.findByIdAndUpdate(
                    req.params.id,
                    req.body,
                    { new: true, runValidators: true }
                );
                if (!updated) return res.status(404).json({ error: 'Item not found' });
                res.status(200).json(updated);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        },

        remove: async (req, res) => {
            try {
                const deleted = await Model.findByIdAndDelete(req.params.id);
                if (!deleted) return res.status(404).json({ error: 'Item not found' });
                res.status(200).json({ message: 'Item deleted successfully' });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        }
    };
};

module.exports = createController;
