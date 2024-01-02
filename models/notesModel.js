const mongoose = require("mongoose");

const notesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: ["Please enter the title!!"],
    },
    content: {
        type: String,
        required: ["Please enter the content!!"],
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: [true, "Notes must belong to a user"],
    },
});

const Notes = mongoose.model("notes", notesSchema);

module.exports = Notes;
