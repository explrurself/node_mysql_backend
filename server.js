require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const https = require("https");
const bodyParser = require("body-parser");
const database = require("./src/Config/database");
const get_user = require("./src/Controller/users");
const PORT = process.env.PORT;
const path = require("path");
const upload_dir = path.dirname(require.main.filename) + "/files";
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
app.use(cors());
app.use(express.json());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);

app.set("view engine", "ejs");
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use("/getusers", get_user);
app.get("/getAllUsers", (req, res) => {
  const limit = parseInt(req.query.limit) || 2;
  const page = parseInt(req.query.page) || 0;
  const searchName = req.query.search || "";

  const offset = page * limit;

  // Build the WHERE clause for the search
  const searchCondition = searchName ? `WHERE name LIKE '%${searchName}%'` : "";

  const query = `
    SELECT *, COUNT(*) OVER() AS full_count
    FROM users
    ${searchCondition}
    ORDER BY id DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  database.query(query, (err, allUsers) => {
    console.log(allUsers);

    if (err) {
      res.status(400).render("Some Error Occured!!");
    } else {
      const totalCount = allUsers.length > 0 ? allUsers[0].full_count : 0;
      const pageCount = Math.ceil(totalCount / limit);

      res.render("GetAllUsers", {
        allUsers: allUsers,
        pageCount: pageCount,
        currentPage: page,
        searchName: searchName,
      });
    }
  });
});

// Seperate API for Downloading CSV FILE

app.get("/downloadCSV", (req, res) => {
  database.query("SELECT * FROM users", (err, users) => {
    if (err) {
      res.status(400).send("Some Error Occurred!!");
    } else {
      const newPath = upload_dir + `/${new Date().getTime()}.csv`;
      // console.log(newPath)
      const csvWriter = createCsvWriter({
        path: newPath,
        header: [
          { id: "id", title: "ID" },
          { id: "name", title: "NAME" },
          { id: "phone", title: "Contact" },
          { id: "email", title: "Email" },
          { id: "gender", title: "Gender" },
          { id: "status", title: "Status" },
        ],
      });
      const records = [];
      users.forEach((user) => {
        records.push({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          status: user.status,
        });
      });

      if (records.length === users.length) {
        csvWriter
          .writeRecords(records) // returns a promise
          .then((data) => {
            console.log(data);
            console.log("...Done");
          });
        res.status(200).send(newPath);
      }
    }
  });
});

app.use("/uploads", express.static("uploads"));
app.use("/files", express.static("files"));
app.get("/", async (req, res) => {
  res.send("************* WELCOME TO NODE SQL APPLICATION *************");
});

if (process.env.ENVIRONMENT === "DEVELOPMENT") {
  var http = require("http").createServer(app);
  http.listen(PORT, () => {
    console.log("*******************************************");
    console.log(`port is listening on ${PORT}`);
  });
}
