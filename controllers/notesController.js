const Notes = require("../models/notesModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createNotes = catchAsync(async (req, res, next) => {
    const { title, content } = req.body;

    if (!title || !content)
        return next(
            new AppError("Please enter the title and content of the notes!!")
        );

    await Notes.create({
        userId: req.user.user,
        title,
        content,
    });

    res.status(200).json({
        message: "Notes inserted successfully",
    });
});

exports.retrieveNotes = catchAsync(async (req, res, next) => {
    const notes = await Notes.find({ userId: req.user.id });
    res.status(200).json({ notes });
});

exports.retrieveOneNotes = catchAsync(async (req, res, next) => {
    const notes = await Notes.find({ _id: req.params.id, userId: req.user.id });
    if (!notes.length)
        return next(new AppError("No notes found with this Id!!"));
    res.status(200).json({ notes });
});

exports.updateNotes = catchAsync(async (req, res, next) => {
    if (!req.params.id) return next(new AppError("Please enter the Id!"));
    const notes = Notes.find({ _id: req.params.id, userId: req.user.id });
    if (!notes) return next(new AppError("No notes found with this ID!!"));
    notes.title = req.body.title || notes.title;
    notes.content = req.body.content || notes.content;
    await notes.save();
    res.status(200).json({ message: "Updated!!" });
});

exports.deleteNote = catchAsync(async (req, res, next) => {
    if (!req.params.id) return next(new AppError("Please enter the Id!"));
    await Notes.deleteOne({ _id: req.params.id });
    res.status(204);
});
