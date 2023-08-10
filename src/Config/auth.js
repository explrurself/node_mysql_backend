const jwt = require("jsonwebtoken");
const database = require("./database");

const verifyToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization");

    if (!token) {
      return res.status(500).send({
        status: "failed",
        message: "Token not provided",
      });
    }
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET_TOKEN);
    database.query(
      "SELECT * FROM users WHERE id = " + decoded.id,
      (err, data) => {
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
              message: "No Account found..!",
            });
          }
          req.id = data[0].id;
          next()
        }
      }
    );
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "Session Timed Out. Token Invalid!",
    });
  }
};

module.exports = verifyToken;
