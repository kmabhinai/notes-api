const nodemail = require("nodemailer");

const sendEmail = async (options) => {
    // 1) Create a transporter

    const transporter = nodemail.createTransport({
        // For gmail

        service: "gmail",
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: "KNLS Computers <knlscomputers@gmail.com>",
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: <h1>${options.subject}</h1>
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
