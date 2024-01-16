const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GroupSchema = new Schema({
  groupname: {
    type: String,
    required: true,
    unique: true,
  },
  groupCode: {
    type: String,
    required: true,
    unique: true,
  },
  adminmember: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },
  ],
  problems: [
    {
      type: Schema.Types.ObjectId,
      ref: "Problem",
    },
  ],
});

module.exports = mongoose.model("Group", GroupSchema);
