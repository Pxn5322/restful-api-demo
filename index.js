let express = require("express");
let path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
const { error } = require("console");
require("dotenv").config();
const { DATABASE_URL } = process.env;

let app = express();
app.use(cors());
app.use(express.json())

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    require: true,
  },
});

async function getPostgresVersion() {
  const client = await pool.connect();
  try {
    const response = await client.query("SELECT version()");
    console.log(response.rows[0]);
  } finally {
    client.release();
  }
}

getPostgresVersion();

app.post('/posts', async (req, res) => {
  const client = await pool.connect();
  try {
    const data = {
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
      created_at: new Date().toISOString()
    }
    const query = 'INSERT INTO posts (title, content, author, created_at) VALUES ($1, $2, $3, $4) RETURNING id';
    const params = [data.title, data.content, data.author, data.created_at];

    const result = await client.query(query, params);
    data.id = result.rows[0].id; //assign the last inserted id to data object

    console.log(`Post created successfully with id ${data.id}`);
    res.json({ "status": "success", "data": data, "message": "Post created successfully" })
  } catch (error) {
    console.error("Error: ", error.message);
    res.status(500).json({ "error": error.message })
  } finally {
    client.release();
  }

});

app.get('/posts', async (req, res) => {
  // Database client
  const client = await pool.connect();
  try {
    // SQL query to get all posts
    const query = 'SELECT * FROM posts';
    // Running the query
    const result = await client.query(query);
    // Send the result to client
    res.json(result.rows);
  } catch (err) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  } finally {
    // Release the client connection
    client.release();
  }
});

app.put('/posts/:id', async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  const client = await pool.connect();
  try {
    const updateQuery = 'UPDATE posts SET title = $1, content = $2, author = $3 WHERE id = $4'
    const queryData = [updatedData.title, updatedData.content, updatedData.author, id];
    await client.query(updateQuery, queryData);

    res.json({ "status:": "success", "message": "Post updated successfully" })
  } catch (err) {
    console.error("Error:", error.message);
    res.status(500).json({ "error": error.message });
  } finally {
    client.release();
  }

})

app.delete("/posts/:id", async (req, res) => {
  const id = req.params.id;
  const client = await pool.connect();
  try {
    const deleteQuery = 'DELETE FROM posts WHERE id = $1';
    await client.query(deleteQuery, [id]);

    res.json({ "status": "success", "message": "Post deleted successfully" });
  } catch (error) {
    console.error("Error: ", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/posts/:id', async (req, res) => {
  const id = req.params.id;
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM posts WHERE id = $1';
    const result = await client.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(result.rows);
  } catch (err) {
    console.log(err.stack);
  } finally {
    client.release();
  }
});

app.get('/posts/author/:authorName', async (req, res) => {
  const author = req.params.authorName;
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM posts WHERE author = $1';
    const result = await client.query(query, [author]);
    res.json(result.rows);
  } catch (err) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.delete("/posts/author/:authorName", async (req, res) => {
  const author = req.params.authorName;
  const client = await pool.connect();
  try {
    const deleteQuery = 'DELETE FROM posts WHERE author = $1';
    const result = await client.query(deleteQuery, [author]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Author not found." })
    }

    res.json({ "message": `All posts by ${author} deleted` });
  } catch (error) {
    console.error("Error: ", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/posts/dates/:startDate/:endDate', async (req, res) => {
  const { startDate, endDate } = req.params;
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM posts WHERE created_at BETWEEN $1 AND $2';
    const result = await client.query(query, [startDate, endDate]);

    res.json(result.rows);
  } catch (err) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/index.html"));
});

//Catch 404 and forward to error handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "404.html"));
});

app.listen(3000, () => {
  console.log("App is listening on port 3000");
});