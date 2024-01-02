const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
    console.log(err.name, err.message);
    process.exit(1);
});

dotenv.config({ path: "./.env" });
const app = require("./app");

// Mongo Db connection
const DB = process.env.DATABASE.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD
);

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then((con) => console.log("Db connected"));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App running on prt ${port}....`);
});

process.on("unhandledRejection", (err) => {
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
