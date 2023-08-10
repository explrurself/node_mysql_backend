const express = require("express");
const router = express.Router();
const database = require("../Config/database");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const upload_dir = path.dirname(require.main.filename) + "/uploads";
const verifyToken = require("../Config/auth");

// Image File upload

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(upload_dir + "/profileImages")) {
      fs.mkdir(path.join(upload_dir, "profileImages"), (err) => {
        if (err) {
          return console.error(err);
        }
        console.log("Directory created successfully!");
      });
    }
    cb(null, path.join(upload_dir, "profileImages"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "." + file.mimetype.split("/")[1]);
  },
});
var upload = multer({ storage });

// Image upload Code End

router.get("/", function (req, res) {
  // console.log("api hit")
  database.query("SELECT * FROM users ORDER BY id desc", function (err, rows) {
    console.log(rows);
    if (err) {
      res.status(400).send({
        status: "failed",
        message: err,
      });
    } else {
      res.status(200).send({
        status: "failed",
        message: "All users!",
        data: rows,
      });
    }
  });
});

// <----------------------------- User Register API ---------------------------->

router.post(
  "/register",
  [
    check("name", "Please enter your Name").not().isEmpty(),
    check("email", "Please enter your Email").not().isEmpty(),
    check("phone", "Please enter your Contact Number").not().isEmpty(),
    check("password", "Please enter your Password").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).send({
        status: "failed",
        message: errors.array()[0],
      });
      return;
    }
    try {
      const hash_password = await bcrypt.hash(req.body.password, saltRounds);
      // return;
      const body = {
        name: req.body.name,
        email: req.body.email,
        password: hash_password,
        gender: req.body.gender,
        phone: req.body.phone,
        date: req.body.dateOfBirth,
      };

      database.query("INSERT INTO users SET ?", body, function (err, result) {
        //if(err) throw err
        if (err) {
          res.status(400).send({
            status: "failed",
            message: err.message,
          });
        } else {
          database.query(
            "SELECT * FROM users WHERE phone = " + req.body.phone,
            (err, data) => {
              if (err) {
                res.status(400).send({
                  status: "failed",
                  message: err.message,
                });
                return;
              } else {
                var token = jwt.sign(
                  { id: data[0].id },
                  process.env.ACCESS_SECRET_TOKEN,
                  {
                    expiresIn: "59m",
                  }
                );
                res.status(200).send({
                  status: "success",
                  message: "Registered Successfully..!!",
                  data: data[0],
                  token,
                });
              }
            }
          );
        }
      });
    } catch (error) {
      res.status(500).send({
        status: "failed",
        message: error.message,
      });
    }
  }
);

// <---------------------------- User Login API -------------------------------->
router.post(
  "/login",
  [
    check("phone", "Please enter your Contact Number").not().isEmpty(),
    check("password", "Please enter your Password").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).send({
        status: "failed",
        message: errors.array()[0],
      });
      return;
    }
    try {
      database.query(
        "SELECT * FROM users WHERE phone = " + req.body.phone,
        async (err, data) => {
          if (err) {
            res.status(400).send({
              status: "failed",
              message: err.message,
            });
            return;
          } else {
            if (data.length <= 0) {
              res.status(400).send({
                status: "failed",
                message: "No user found against this number for login",
                data: data[0],
                token,
              });
              return;
            }

            const compare_password = await bcrypt.compareSync(
              req.body.password,
              data[0].password
            );
            if (compare_password === false) {
              res.status(400).send({
                status: "failed",
                message: "Invalid password",
              });
              return;
            }
            var token = jwt.sign(
              { id: data[0].id },
              process.env.ACCESS_SECRET_TOKEN,
              {
                expiresIn: "59m",
              }
            );
            res.status(200).send({
              status: "success",
              message: "Login successfull..!!",
              data: data[0],
              token,
            });
          }
        }
      );
    } catch (error) {
      res.status(500).send({
        status: "failed",
        message: error.message,
      });
    }
  }
);

// <--------------------------- Update Profile Pic ----------------------------->

router.put(
  "/update-profile",
  verifyToken,
  upload.single("profile_pic"),
  async (req, res) => {
    try {
      database.query(
        "SELECT * FROM users WHERE id = " + req.id,
        (err, data) => {
          if (req.file) {
            if (data[0].profile_pic !== null) {
              fs.unlink(
                path.join(
                  path.dirname(require.main.filename),
                  data[0]?.profile_pic
                ),
                (err) => {
                  if (err) console.log(err);
                  console.log("file removed successfully");
                }
              );
            }
            const update_body = {
              profile_pic: "/uploads/profileImages/" + req?.file?.filename,
            };

            database.query(
              "UPDATE users SET ? WHERE id = " + req.id,
              update_body,
              (err, updated_data) => {
                if (err) {
                  res.status(400).send({
                    status: "failed",
                    message: err.message,
                  });
                  return;
                } else {
                  res.status(200).send({
                    status: "success",
                    message: "Profile Image Updated successfully..!",
                  });
                }
              }
            );
          }
        }
      );
    } catch (error) {
      console.log(error)
      res.status(500).send({
        status: "failed",
        message: error.message,
      });
    }
  }
);

// <--------------------------- Get Single User -------------------------------->

router.get("/single", verifyToken, async (req, res) => {
  try {
    database.query("SELECT * FROM users WHERE id = " + req.id, (err, data) => {
      res.status(200).send({
        status: "success",
        message: "your profile data..!",
        data: data[0],
      });
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: error.message,
    });
  }
});

// <--------------------------- Delete Account Permanently --------------------->

router.delete("/delete", verifyToken, async (req, res) => {
  try {
    database.query("DELETE FROM users WHERE id = " + req.id, (err, data) => {
      res.status(200).send({
        status: "success",
        message: "Account deleted successfully..!!",
      });
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: error.message,
    });
  }
});

module.exports = router;
