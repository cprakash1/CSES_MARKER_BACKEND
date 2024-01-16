const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProblemSchema = new Schema({
  problemName: {
    type: String,
    required: true,
  },
  problemId: {
    type: String,
    required: true,
  },
  isImportant: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: "",
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: "Group",
  },
});

module.exports = mongoose.model("Problem", ProblemSchema);
