const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const Record = mongoose.model('Record');
const requireAuth = require('../middleware/requireAuth');
const router = express.Router();

// router.put('/updateallrecords', async (req, res) => {
// 	const updatedRecords = await Record.deleteMany({
// 		year: '2023',
// 	});
// 	// const updatedRecords = await Record.updateMany(
// 	// 	{},
// 	// 	{
// 	// 		$unset: {
// 	// 			startingBal: 0,
// 	// 		},
// 	// 	},
// 	// 	{ multi: true }
// 	// );
// 	res.json(updatedRecords);
// });

// Create Record
router.post('/records', requireAuth, async (req, res) => {
	const { _id } = req?.user;
	let errors = {};
	try {
		const record = await Record.create({
			...req?.body,
			user: _id,
		});
		res.json(record);
	} catch (err) {
		errors.records = 'Error creating record';
		return res.status(400).json(errors);
	}
});

// Create New Year Records
router.post('/records/year/:year', requireAuth, async (req, res) => {
	const { _id } = req?.user;
	const { year } = req?.params;
	let errors = {};
	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];

	try {
		for (let i = 0; i < months.length; i++) {
			await Record.create({
				month: months[i],
				year,
				user: _id,
			});
		}
		const newYear = await Record.find({ year });
		res.json(newYear);
	} catch (err) {
		errors.records = 'Error creating new year records';
		return res.status(400).json({ errors, err });
	}
});

// Get All Records
router.get('/records', async (req, res) => {
	const hasYear = req?.query?.year;
	let errors = {};
	let records;
	try {
		if (hasYear) {
			records = await Record.find({ year: hasYear }).sort('createdAt');
		} else {
			records = await Record.find({}).sort('createdAt');
		}
		res.json(records);
	} catch (err) {
		errors.records = 'Error getting records';
		return res.status(400).json(errors);
	}
});

// Get Single Record
router.get('/records/:id', async (req, res) => {
	const { id } = req?.params;
	let errors = {};
	const record = await Record.findById(id).populate('user');
	if (!record) {
		errors.records = 'Error, record not found';
		return res.status(404).json(errors);
	}
	try {
		const record = await Record.findById(id).populate('user');
		res.json(record);
	} catch (err) {
		errors.records = 'Error getting record';
		return res.status(400).json(errors);
	}
});

// Update Record
router.put('/records/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;
	let errors = {};
	const record = await Record.findById(id);
	if (!record) {
		errors.records = 'Error, record not found';
		return res.status(404).json(errors);
	}
	try {
		const updatedRecord = await Record.findByIdAndUpdate(
			id,
			{
				$set: req?.body,
			},
			{
				new: true,
			}
		);
		const updatedRecords = await Record.find({});
		res.json({ record: updatedRecord, records: updatedRecords });
	} catch (err) {
		errors.update = 'Error updating record';
		return res.status(400).json(errors);
	}
});

// Add Revenue
router.put('/records/revenue/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;
	const revData = { ...req?.body };
	let errors = {};

	try {
		const updatedRecord = await Record.findByIdAndUpdate(
			id,
			{
				$push: { revenue: revData },
			},
			{ new: true }
		);
		const updatedRecords = await Record.find({});
		res.json({ record: updatedRecord, records: updatedRecords });
	} catch (err) {
		errors.revenue = 'Error adding revenue';
		return res.status(400).json(errors);
	}
});

// Add Expense
router.put('/records/expense/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;
	const expData = { ...req?.body };
	let errors = {};

	try {
		const updatedRecord = await Record.findByIdAndUpdate(
			id,
			{
				$push: { expenses: expData },
			},
			{ new: true }
		);
		const updatedRecords = await Record.find({});
		res.json({ record: updatedRecord, records: updatedRecords });
	} catch (err) {
		errors.revenue = 'Error adding revenue';
		return res.status(400).json(errors);
	}
});

// Delete Record
router.delete('/records/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;
	let errors = {};
	const record = await Record.findById(id);
	if (!record) {
		errors.records = 'Error, record not found';
		return res.status(404).json(errors);
	}
	try {
		const deletedRecord = await record?.delete();
		res.json(deletedRecord);
	} catch (err) {
		errors.delete = 'Error deleting record';
		return res.status(400).json(errors);
	}
});

module.exports = router;
