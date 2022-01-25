const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Record = mongoose.model('Record');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const requireAuth = require('../middleware/requireAuth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const dayjs = require('dayjs');
const {
	validateRegisterData,
	validateLoginData,
} = require('../utils/validators');

const router = express.Router();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// router.put('/updateallusers', async (req, res) => {
// 	const updatedUsers = await User.updateMany({
// 		profilePhoto:
// 			'https://res.cloudinary.com/dcxmdnu2h/image/upload/v1639171987/bo7933fr3wmulznyog83.jpg',
// 	});
// 	res.json(updatedUsers);
// });

// Register User
router.post('/users/register', async (req, res) => {
	let userData;

	const { valid, errors } = validateRegisterData(req?.body);

	if (!valid) return res.status(400).json(errors);

	try {
		const user = new User(req?.body);
		await user?.save();
		const token = jwt.sign({ userId: user?._id }, 'MY_SECRET_KEY', {
			expiresIn: '10d',
		});
		userData = {
			_id: user?._id,
			handle: user?.handle,
			email: user?.email,
			profilePhoto: user?.profilePhoto,
			isAdmin: user?.isAdmin,
			isSuperUser: user?.isSuperUser,
			isVerified: user?.isVerified,
			isBlocked: user?.isBlocked,
			token,
		};
		res.json(userData);
	} catch (err) {
		console.log(err);
		if (err.code === 11000) {
			errors.email = 'Email already in use';
			return res.status(422).json(errors);
		} else {
			errors.general = 'Unable to register user';
			return res.status(422).json(errors);
		}
	}
});

// User Login
router.post('/users/login', async (req, res) => {
	const { email, password } = req?.body;
	const year = dayjs(new Date().toDateString()).format('YYYY');
	let userData;

	const { valid, errors } = validateLoginData(req?.body);

	if (!valid) return res.status(400).json(errors);

	const user = await User.findOne({ email });
	if (!user) {
		errors.email = 'Invalid Email or password';
		return res.status(404).json(errors);
	}

	try {
		await user?.comparePassword(password);
		const token = jwt.sign({ userId: user?._id }, 'MY_SECRET_KEY', {
			expiresIn: '10d',
		});
		const userRecords = await Record.find({ year });
		userData = {
			_id: user?._id,
			handle: user?.handle,
			email: user?.email,
			profilePhoto: user?.profilePhoto,
			isAdmin: user?.isAdmin,
			isSuperUser: user?.isSuperUser,
			isVerified: user?.isVerified,
			isBlocked: user?.isBlocked,
			token,
		};
		return res.json({ userData, userRecords });
	} catch (err) {
		console.log(err);
		errors.password = 'Invalid email or Password';
		return res.status(400).json(errors);
	}
});

// Get All Users
router.get('/users', requireAuth, async (req, res) => {
	let errors = {};
	let endUsers = [];
	try {
		const allUsers = await User.find({});
		allUsers?.forEach((user) => {
			endUsers.push({
				_id: user?._id,
				handle: user?.handle,
				profilePhoto: user?.profilePhoto,
				email: user?.email,
				isBlocked: user?.isBlocked,
				isAdmin: user?.isAdmin,
				isVerified: user?.isVerified,
				createdAt: user?.createdAt,
				updatedAt: user?.updatedAt,
			});
		});
		res.json(endUsers);
	} catch (err) {
		errors.users = 'Error getting users';
		return res.status(400).json(errors);
	}
});

// Delete Single User
router.delete('/users/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;
	let errors = {};
	const user = await User.findById(id);
	if (!user) {
		errors.user = 'Error, user not found';
		return res.status(404).json(errors);
	}

	try {
		await user.delete();
		const updatedUsers = await User.find({});
		let endUsers = [];
		updatedUsers.forEach((user) => {
			endUsers.push({
				_id: user?._id,
				handle: user?.handle,
				profilePhoto: user?.profilePhoto,
				email: user?.email,
				isBlocked: user?.isBlocked,
				isAdmin: user?.isAdmin,
				isVerified: user?.isVerified,
				createdAt: user?.createdAt,
				updatedAt: user?.updatedAt,
			});
		});
		res.json(endUsers);
	} catch (err) {
		errors.delete = 'Error deleting user';
		return res.status(400).json(errors);
	}
});

// Get User Details
router.get('/users/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;
	let errors = {};

	try {
		const user = await User.findById(id);
		if (!user) {
			errors.user = 'Error user not found';
			return res.status(404).json(errors);
		}

		res.json(user);
	} catch (err) {
		errors.user = 'Error getting user details';
		return res.status(400).json(errors);
	}
});

// Get User Profile
router.get('/users/profile/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;
	let errors = {};
	const user = await User.findById(id);
	if (!user) {
		errors.user = 'Error, user not found';
		return res.status(404).json(errors);
	}

	try {
		const userProfile = await User.findById(id);
		res.json(userProfile);
	} catch (err) {
		errors.user = 'Error getting user profile';
		return res.status(400).json(errors);
	}
});

// Generate Account Verification Token
router.post(
	'/users/send-verification-request',
	requireAuth,
	async (req, res) => {
		const { _id, email } = req?.user;
		let errors = {};
		const user = await User.findById(_id);
		try {
			const verificationToken = user?.createVerificationToken();
			await user?.save();

			const verificationUrl = `<a href='http://localhost:3000/verify-account/${verificationToken}'>Click here to verify your account.</a> Link valid for 10 minutes.`;
			const msg = {
				to: email,
				from: process.env.SG_BASE_EMAIL,
				subject: 'Verify Your Account',
				html: verificationUrl,
			};

			await sgMail.send(msg);
			res.json(verificationUrl);
		} catch (err) {
			errors.validation = 'Error generating verification token';
			return res.status(400).json(errors);
		}
	}
);

// Acount Verification
router.put('/users/verify-account', requireAuth, async (req, res) => {
	let errors = {};
	const hashedToken = crypto
		.createHash('sha256')
		.update(req?.body?.token)
		.digest('hex');
	const user = await User.findOne({
		accountVerificationToken: hashedToken,
		accountVerificationTokenExpires: { $gt: new Date() },
	});
	if (!user) {
		errors.token = 'Token expired, try again later';
		return res.status(400).json(errors);
	}

	try {
		user.isVerified = true;
		user.accountVerificationToken = undefined;
		user.accountVerificationTokenExpires = undefined;
		const verifiedUser = await user?.save();
		const updatedUser = {
			_id: verifiedUser?._id,
			handle: verifiedUser?.handle,
			email: verifiedUser?.email,
			profilePhoto: verifiedUser?.profilePhoto,
			isAdmin: verifiedUser?.isAdmin,
			isVerified: verifiedUser?.isVerified,
			isBlocked: verifiedUser?.isBlocked,
		};
		res.json(updatedUser);
	} catch (err) {
		errors.token = 'Error verifing token';
		return res.status(400).json(errors);
	}
});

// Generate Password Reset Token
router.post('/users/forgot-password-token', async (req, res) => {
	const { email } = req?.body;
	let errors = {};
	const user = await User.findOne({ email });

	if (!user) {
		errors.user = 'Error, user not found';
		return res.status(404).json(errors);
	}

	try {
		const resetToken = user?.createPasswordResetToken();
		await user?.save();

		const resetUrl = `<h3>We've received a request to reset your password!</h3> \n Hi ${email}, we received a password reset request from your account. To complete the reset, please <a href='http://localhost:3000/reset-password/${resetToken}'>click here.</a> The link is valid for 10 minutes. \n If this was not intended or you have questions about your account, please contact an admin right away.`;
		const msg = {
			to: email,
			from: process.env.SG_BASE_EMAIL,
			subject: 'Reset Your Password',
			html: resetUrl,
		};

		await sgMail.send(msg);
		res.json(
			`A password reset link has been sent to ${user?.email}. The link is valid for 10 minutes.`
		);
	} catch (err) {
		errors.token = 'Error generating token';
		return res.status(400).json(errors);
	}
});

// Password Reset
router.put('/users/reset-password', async (req, res) => {
	let errors = {};
	const hashedToken = crypto
		.createHash('sha256')
		.update(req?.body?.token)
		.digest('hex');
	const user = await User.findOne({
		passwordResetToken: hashedToken,
		passwordResetTokenExpires: { $gt: new Date() },
	});

	if (!user) {
		errors.token = 'Token expired, try again later';
		return res.status(400).json(errors);
	}
	try {
		user.password = req?.body?.password;
		user.passwordResetToken = undefined;
		user.passwordResetTokenExpires = undefined;

		await user?.save();

		const successMessage = `<h3>Password Change Notification</h3> <p>This e-mail confirms that the password has been changed for your account.</p> <p>If you did not intend to change your password, please contact an admin right away.</p> `;
		const msg = {
			to: user?.email,
			from: process.env.SG_BASE_EMAIL,
			subject: 'Your Password Has Been Updated',
			html: successMessage,
		};

		await sgMail.send(msg);
		res.json('Password Upated Successfully!');
	} catch (err) {
		errors.token = 'Error verifing token';
		return res.status(400).json(errors);
	}
});

// Update User Profile
router.put('/users/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;
	let errors = {};
	const user = await User.findById(id);

	if (!user) {
		errors.user = 'Error, user not found';
		return res.status(404).json(errors);
	}

	if (req?.body?.password) {
		const salt = await bcrypt.genSalt(10);
		req.body.password = await bcrypt.hash(req?.body?.password, salt);
	}

	try {
		const updatedUser = await User.findByIdAndUpdate(
			id,
			{
				$set: req?.body,
			},
			{
				new: true,
				runValidators: true,
			}
		);
		const userData = {
			_id: updatedUser?._id,
			handle: updatedUser?.handle,
			email: updatedUser?.email,
			profilePhoto: updatedUser?.profilePhoto,
			isAdmin: updatedUser?.isAdmin,
			isVerified: updatedUser?.isVerified,
			isBlocked: updatedUser?.isBlocked,
		};
		const userProfile = await User.findById(id);

		res.json({ user: userData, profile: userProfile });
	} catch (err) {
		errors.update = 'Error updating profile';
		return res.status(400).json(errors);
	}
});

//Block User
router.put('/users/block-user/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;
	let errors = {};
	const user = await User.findById(id);

	if (!user) {
		errors.user = 'Error, user not found';
		return res.status(404).json(errors);
	}

	try {
		await User.findByIdAndUpdate(id, { isBlocked: true }, { new: true });
		let updatedUsers = await User.find({});
		let endUsers = [];
		updatedUsers?.forEach((user) => {
			endUsers?.push({
				_id: user?._id,
				handle: user?.handle,
				profilePhoto: user?.profilePhoto,
				email: user?.email,
				isBlocked: user?.isBlocked,
				isAdmin: user?.isAdmin,
				isVerified: user?.isVerified,
				createdAt: user?.createdAt,
				updatedAt: user?.updatedAt,
			});
		});
		res.json(endUsers);
	} catch (err) {
		errors.block = 'Error blocking user';
		return res.status(400).json(errors);
	}
});

// Unblock User
router.put('/users/unblock-user/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;
	let errors = {};
	const user = await User.findById(id);

	if (!user) {
		errors.user = 'Error, user not found';
		return res.status(404).json(errors);
	}

	try {
		await User.findByIdAndUpdate(id, { isBlocked: false }, { new: true });
		let updatedUsers = await User.find({});
		let endUsers = [];
		updatedUsers?.forEach((user) => {
			endUsers?.push({
				_id: user?._id,
				handle: user?.handle,
				profilePhoto: user?.profilePhoto,
				email: user?.email,
				isBlocked: user?.isBlocked,
				isAdmin: user?.isAdmin,
				isVerified: user?.isVerified,
				createdAt: user?.createdAt,
				updatedAt: user?.updatedAt,
			});
		});
		res.json(endUsers);
	} catch (err) {
		errors.unblock = 'Error unblocking user';
		return res.status(400).json(errors);
	}
});

// Profile Photo Upload

const storage = multer.memoryStorage();

const filter = (req, file, cb) => {
	if (file?.mimetype?.startsWith('image')) {
		cb(null, true);
	} else {
		cb({ message: 'Unsupported file format.' }, false);
	}
};

const upload = multer({
	storage: storage,
	fileFilter: filter,
	limits: { fileSize: 5000000 },
});

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_SECRET_KEY,
	secure: true,
});

const cloudinaryUpload = async (fileToUpload) => {
	try {
		const data = await cloudinary.uploader.upload(fileToUpload, {
			resource_type: 'auto',
		});
		return {
			url: data?.secure_url,
		};
	} catch (err) {
		return err;
	}
};

router.put(
	'/profilephoto-upload',
	requireAuth,
	upload.single('file'),
	async (req, res) => {
		const { _id } = req?.user;
		const { b64str } = req?.body;
		let errors = {};
		try {
			const uploadedImage = await cloudinaryUpload(b64str);
			const user = await User.findByIdAndUpdate(
				_id,
				{
					profilePhoto: uploadedImage?.url,
				},
				{ new: true }
			);
			const userProfile = await User.findById(_id);
			const userData = {
				_id: user?._id,
				firstName: user?.firstName,
				lastName: user?.lastName,
				handle: user?.handle,
				email: user?.email,
				profilePhoto: user?.profilePhoto,
				isAdmin: user?.isAdmin,
				isSuperUser: user?.isSuperUser,
				isVerified: user?.isVerified,
				isBlocked: user?.isBlocked,
				following: user?.following,
			};
			res.json({ user: userData, profile: userProfile });
		} catch (err) {
			errors.photo = 'Error uploading photo';
			return res.status(400).json(errors);
		}
	}
);

module.exports = router;
