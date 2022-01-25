require('./models/User');
require('./models/Record');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const recordRoutes = require('./routes/recordRoutes');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URL, {
	useUnifiedTopology: true,
	useNewUrlParser: true,
});

mongoose.connection.on('connected', () => {
	console.log('Connected to mongo instance.');
});
mongoose.connection.on('error', (err) => {
	console.error('Error connecting to mongo.', err);
});

app.use(userRoutes);
app.use(recordRoutes);

app.listen(process.env.PORT || 3005, () => {
	console.log('Listening on port 3005');
});
