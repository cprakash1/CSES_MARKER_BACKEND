// env variables
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const User = require("./models/User");
const Problem = require("./models/Problem");
const Group = require("./models/Group");
const cors = require("cors");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = process.env.Db_Url;

mongoose
  .connect(db, {})
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log("Error: ", err.message);
  });

// POST request to add a new user
app.post("/userRegister", async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password || !username)
    return res.send({ success: false, message: "INVALID INPUT" });
  // email validator regex
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    res.send({ success: false, message: "INVALID EMAIL" });
  } else {
    const newUser = new User({
      email,
      password,
      username,
    });
    try {
      await newUser.save();
      res.send({ success: true });
    } catch (err) {
      res.send({
        success: false,
        message: "USERNAME OR EMAIL ALREADY EXISTS",
      });
    }
  }
});

// POST request to create a new group
app.post("/createGroup", async (req, res) => {
  const { groupname, groupCode, username, password } = req.body;
  if (!groupname || !groupCode || !username || !password)
    return res.send({ success: false, message: "INVALID INPUT" });
  const adminmember = await User.find({ username, password }).populate(
    "questions"
  );
  if (adminmember.length === 0)
    return res.send({
      success: false,
      message: "USER WITH USERNAME NOT FOUND",
    });
  const newGroup = new Group({
    groupname,
    groupCode,
    adminmember: adminmember[0],
  });
  try {
    // check if member already in some group
    if (adminmember[0].groupJoined)
      return res.send({ success: false, message: "USER ALREADY IN A GROUP" });
    // save all the prolems of the members in the group
    adminmember[0].groupJoined = newGroup;
    for (let i = 0; i < adminmember[0].questions.length; i++) {
      const problem = await Problem.findOne({
        _id: adminmember[0].questions[i]._id,
      });
      problem.group = newGroup._id;
      await problem.save();
      newGroup.problems.push(problem);
    }

    await newGroup.save();
    await adminmember[0].save();
    res.send({ success: true });
  } catch (err) {
    res.send({
      success: false,
      message: "GROUPNAME OR GROUPCODE ALREADY EXISTS" + err,
    });
  }
});

// POST request to add a new member to a group
app.post("/addMember", async (req, res) => {
  const { groupCode, username, groupname, password } = req.body;
  if (!groupCode || !username || !groupname || !password)
    return res.send({ success: false, message: "INVALID INPUT" });
  const group = await Group.find({ groupname, groupCode });
  if (group.length === 0)
    return res.send({
      success: false,
      message: "GROUP WITH GROUPCODE NOT FOUND",
    });
  const member = await User.find({ username, password }).populate("questions");
  if (member.length === 0)
    return res.send({
      success: false,
      message: "USER WITH USERNAME NOT FOUND",
    });
  // check if member already exists in the group
  for (let i = 0; i < group[0].members.length; i++) {
    if (group[0].members[0].equals(member[0]._id))
      return res.send({
        success: false,
        message: "USER ALREADY EXISTS IN THE GROUP",
      });
  }
  group[0].members.push(member[0]);
  try {
    // check if member already in some group
    if (member[0].groupJoined)
      return res.send({ success: false, message: "USER ALREADY IN A GROUP" });
    member[0].groupJoined = group[0];
    // save all the prolems of the members in the group
    for (let i = 0; i < member[0].questions.length; i++) {
      const problem = await Problem.findOne({
        _id: member[0].questions[i]._id,
      });
      problem.group = group[0]._id;
      await problem.save();
      group[0].problems.push(problem);
    }
    await member[0].save();
    await group[0].save();
    res.send({ success: true });
  } catch (err) {
    console.log(err);
    res.send({
      success: false,
      message: "USER ALREADY EXISTS IN THE GROUP",
    });
  }
});

// POST request to login a user
app.post("/userLogin", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.send({ success: false, message: "INVALID INPUT" });
  const user = await User.find({ username, password }).populate("questions");
  if (user.length === 0)
    return res.send({ success: false, message: "INVALID CREDENTIALS" });
  // res.send({ success: true, _id: user[0]._id });
  // make a post request redirect to /getProblems
  try {
    if (user[0].groupJoined) {
      const group = await Group.find({ _id: user[0].groupJoined }).populate(
        "problems"
      );
      return res.send({
        success: true,
        problems: group[0].problems,
        user: user[0],
      });
    } else {
      return res.send({
        success: true,
        problems: user[0].questions,
        user: user[0],
      });
    }
  } catch (err) {
    res.send({ success: false, message: "INVALID INPUT" });
  }
});

// POST request to add a new problem
app.post("/addProblem", async (req, res) => {
  const {
    username,
    problemId,
    problemName,
    isImportant = false,
    message = "",
  } = req.body;
  if (!username || !problemId || !problemName)
    return res.send({ success: false, message: "INVALID INPUT" });
  const user = await User.find({ username }).populate("questions");
  if (user.length === 0)
    return res.send({
      success: false,
      message: "USER WITH USERNAME NOT FOUND",
    });
  // check if problem already exists
  for (let i = 0; i < user[0].questions.length; i++) {
    if (user[0].questions[i].problemId === problemId) {
      const problem = await Problem.find({ _id: user[0].questions[i]._id });
      problem[0].isImportant = isImportant;
      problem[0].message = message;
      await problem[0].save();
      return res.send({ success: true, message: "Changed" });
    }
  }
  const newProblem = new Problem({
    problemId,
    problemName,
    isImportant,
    message,
    user: user[0],
    username,
  });
  try {
    if (user[0].groupJoined) {
      newProblem.group = user[0].groupJoined;
      const group = await Group.find({ _id: user[0].groupJoined });
      group[0].problems.push(newProblem);
      await group[0].save();
    }
    await newProblem.save();
    user[0].questions.push(newProblem);
    await user[0].save();
    res.send({ success: true });
  } catch (err) {
    res.send({
      success: false,
      message: "PROBLEM WITH PROBLEM ID ALREADY EXISTS",
    });
  }
});

// POST request to get all problems
app.post("/getProblems", async (req, res) => {
  const { _id } = req.body;
  if (!_id) return res.send({ success: false, message: "INVALID INPUT" });
  try {
    const user = await User.find({ _id }).populate("questions");
    if (user.length === 0)
      return res.send({
        success: false,
        message: "USER WITH USERNAME NOT FOUND",
      });
    if (user[0].groupJoined) {
      const group = await Group.find({ _id: user[0].groupJoined }).populate(
        "problems"
      );
      return res.send({
        success: true,
        problems: group[0].problems,
        user: user[0],
      });
    } else {
      return res.send({
        success: true,
        problems: user[0].questions,
        user: user[0],
      });
    }
  } catch (err) {
    res.send({ success: false, message: "INVALID INPUT" });
  }
});

// POST request to final sync with user
app.post("/sync", async (req, res) => {
  const { user } = req.body;
  if (!user) return res.send({ success: false, message: "INVALID INPUT" });
  try {
    const dbUser = await User.findOne({ _id: user._id }).populate("questions");
    if (!dbUser)
      return res.send({
        success: false,
        message: "USER WITH USERNAME NOT FOUND",
      });
    if (dbUser.groupJoined) {
      const group = await Group.findOne({ _id: dbUser.groupJoined }).populate(
        "problems"
      );
      dbUser.sorting = user.sorting;
      dbUser.filter = user.filter;
      async function updateQuestions(user) {
        for (const question of user.questions) {
          if (question._id) {
            // If the question has an _id, update an existing document
            const dbQuestion = await Problem.findOne({ _id: question._id });
            dbQuestion.isImportant = question.isImportant;
            dbQuestion.message = question.message;
            await dbQuestion.save();
          } else {
            // If the question doesn't have an _id, create a new document
            const newProblem = new Problem({
              problemId: question.problemId,
              problemName: question.problemName,
              isImportant: question.isImportant,
              message: question.message,
              user: dbUser,
              group: dbUser.groupJoined,
              username: question.username,
            });

            await newProblem.save();
            group.problems.push(newProblem);
            await group.save();
            dbUser.questions.push(newProblem);
            await dbUser.save();
          }
        }
      }

      await updateQuestions(user);
      const newGroup = await Group.findOne({
        _id: dbUser.groupJoined,
      }).populate("problems");
      const newUser = await User.findOne({ _id: dbUser._id }).populate(
        "questions"
      );
      return res.send({
        success: true,
        problems: newGroup.problems,
        user: newUser,
      });
    } else {
      dbUser.sorting = user.sorting;
      dbUser.filter = user.filter;
      async function updateQuestions(user) {
        for (const question of user.questions) {
          if (question._id) {
            const dbQuestion = await Problem.findOne({ _id: question._id });
            dbQuestion.isImportant = question.isImportant;
            dbQuestion.message = question.message;
            await dbQuestion.save();
          } else {
            const newProblem = new Problem({
              problemId: question.problemId,
              problemName: question.problemName,
              isImportant: question.isImportant,
              message: question.message,
              user: dbUser,
              username: question.username,
            });

            await newProblem.save();
            dbUser.questions.push(newProblem);
            await dbUser.save();
          }
        }
      }

      await updateQuestions(user);

      const newUser = await User.findOne({ _id: user._id }).populate(
        "questions"
      );

      return res.send({
        success: true,
        problems: newUser.questions,
        user: newUser,
      });
    }
  } catch (err) {
    console.log(err);
    res.send({ success: false, message: "INVALID INPUT" + err });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
