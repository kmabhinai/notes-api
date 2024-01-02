const express = require("express");
const authController = require("./../controllers/authController");
const notesController = require("./../controllers/notesController");

const router = express.Router();

router.use(authController.protect);

router
    .route("/")
    .get(notesController.retrieveNotes)
    .post(notesController.createNotes);

router
    .route("/:id")
    .get(notesController.retrieveOneNotes)
    .patch(notesController.updateNotes)
    .delete(notesController.deleteNote);

module.exports = router;
