const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
	{
		month: {
			type: String,
			required: [true, 'Month is required'],
		},
		year: {
			type: String,
			required: [true, 'Year is required'],
		},
		startBal: {
			type: Number,
			default: 0,
		},
		revenue: {
			type: Array,
		},
		expenses: {
			type: Array,
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'User is required'],
		},
	},
	{
		toJSON: {
			virtuals: true,
		},
		toObject: {
			virtuals: true,
		},
		timestamps: true,
	}
);

mongoose.model('Record', recordSchema);
