const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const sendEmail = require("./../utils/email");

const signToken = (id) => {
    return jwt.sign(
        {
            id: id,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN,
        }
    );
};

exports.signup = catchAsync(async (req, res, next) => {
    const { name, phone, email, userName, photo, password, passwordConfirm } =
        req.body;
    if (!email) return next(new AppError("Enter Email Id!!", 400));
    if (!phone) return next(new AppError("Enter phone number!!", 400));

    const isUser = await User.findOne({
        $or: [
            { email, phone },
            { email, phone, userName },
        ],
    });

    if (!userName) userName = new Date().toString(36);

    if (isUser) return next(new AppError("User already Exists!!", 400));
    if (!password || !passwordConfirm)
        return next(new AppError("Enter password and confirm Password", 400));

    const otp = Math.floor(Math.random() * 1000000);

    sendEmail({
        email: email,
        subject: "Welcome to KNLS!",
        message: `Hi ${name},\n\nWelcome to KNLS. We hope you have a great experience with us.\n\n Your otp for verification of email is ${otp}.\n\nRegards,\nKNLS Computers`,
    });

    const newUser = await User.create({
        name,
        phone,
        email,
        userName,
        photo,
        password,
        passwordConfirm,
    });

    res.status(201).json({
        status: "Proceed to account verification",
        data: {
            name: newUser.name,
            email: newUser.email,
        },
    });
});

exports.resendOtp = catchAsync(async (req, res, next) => {
    const email = req.body.email;
    const user = await User.findOne({ email });

    if (!user) return next(new AppError("User not found!", 404));

    const otp = Math.floor(Math.random() * 1000000);
    sendEmail({
        email: email,
        subject: "Welcome to KNLS!",
        message: `Hi ${user.name},\n\nWelcome to KNLS. We hope you will have a great experience with us.\n\n Your otp for verification of email is ${otp}.\n\nRegards,\nKNLS Computers`,
    });

    user.otp = otp;
    await user.save();

    res.status(200).json({
        status: "resent otp",
    });
});

exports.verify = catchAsync(async (req, res, next) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return next(new AppError("User not found!", 404));

    if (user.otp != otp) return next(new AppError("Incorrect Otp!!", 401));

    const token = signToken(user._id);
    user.verified = true;

    user.otp = undefined;
    await user.save({ validateBeforeSave: false });

    user.password = undefined;

    res.status(200).json({
        status: "success",
        token,
        data: {
            email: user.email,
            name: user.name,
        },
    });
});

exports.login = catchAsync(async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password)
        return new next(AppError("Please provide email and password!", 400));

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password)))
        return next(new AppError("Incorrect email or password", 401));
    if (!user.verified)
        return next(new AppError("Please verify your email first", 401));
    const token = signToken(user._id);

    res.status(201).json({
        status: "success",
        token,
        data: {
            email: user.email,
            name: user.name,
        },
    });
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token)
        return next(
            new AppError(
                "You are not logged in! Please log in to get access.",
                401
            )
        );

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser)
        return next(
            new AppError(
                "The user belonging to this token does no longer exist.",
                401
            )
        );

    req.user = currentUser;
    res.locals.user = currentUser;

    next();
});

exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET
            );
            // 3) Check if user still exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            }

            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            res.locals.user = currentUser;
            return next();
        } catch {
            return next();
        }
    }
    next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new AppError("There is no user with email address.", 404));
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `https://knls.com/users/resetPassword/${resetToken}`;

    const message = `It seems you have sent a forgot password request for KNLS Computers account. Your password reset url (valid for 10 minutes)\n\n${resetURL}`;

    try {
        await sendEmail({
            email: user.email,
            subject: "Your password reset token (valid for 10 minutes)",
            message,
        });
        res.status(200).json({
            status: "success",
            message: "Token sent to email!",
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                "There was an error sending the email. Try again later!",
                500
            )
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    //1) Get user based on the token
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    //2) If token has not expired, and there is user, set the new password

    if (!user) {
        return next(new AppError("Token is invalid or has expired", 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    const token = signToken(user._id);

    res.status(200).json({
        status: "success",
        token,
    });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select("+password");

    if (!(await user.correctPassword(req.body.passwordCurrent, user.password)))
        return next(new AppError("Your current password is wrong.", 401));

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    const token = signToken(user._id);
    res.status(200).json({
        status: "success",
        token,
    });
});
