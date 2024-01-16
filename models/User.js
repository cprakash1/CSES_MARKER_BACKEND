const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  questions: [
    {
      type: Schema.Types.ObjectId,
      ref: "Problem",
    },
  ],
  sorting: {
    type: String,
    default: "none",
  },
  filter: {
    type: String,
    default: "none",
  },
  groupJoined: {
    type: Schema.Types.ObjectId,
    ref: "Group",
  },
});

module.exports = mongoose.model("User", UserSchema);
