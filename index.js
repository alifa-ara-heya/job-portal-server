const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();


//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kvlax.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


        // job related apis
        const jobsCollection = client.db('jobPortal').collection('jobs')
        const jobApplicationCollection = client.db('jobPortal').collection('job-applications')

        // get the data
        // app.get('/jobs', async (req, res) => {
        //     const cursor = jobsCollection.find();
        //     const result = await cursor.toArray();
        //     res.send(result);
        // })

        // get jobs data conditionally, if there is an hr email, it will get you only the hr related jobs, otherwise you will get all the data
        app.get('/jobs', async (req, res) => {
            const email = req.query.email;
            let query = {};
            if (email) {
                query = { hr_email: email }
            }
            const cursor = jobsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })
        // now check http://localhost:5000/jobs to get all the data,
        // http://localhost:5000/jobs?email=flower111@flower.com will give the data related to the hr.



        // get the individual data
        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await jobsCollection.findOne(query);
            res.send(result)
        })

        // post job
        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        })


        // job application apis
        // get one/all/many data
        // app.get('/job-applications', async (req, res) => {
        //     const cursor = jobApplicationCollection.find();
        //     const result = await cursor.toArray();
        //     res.send(result);
        // })

        // getting user's job applications with the email
        app.get('/job-applications', async (req, res) => {
            const email = req.query.email;
            const query = { applicant_email: email }
            const result = await jobApplicationCollection.find(query).toArray();

            // fokira way to aggregate data 
            // because you will not have all the job information here, just the job id, so we will loop;
            for (const application of result) {
                // console.log(application.job_id);
                const query = { _id: new ObjectId(application.job_id) }
                const result = await jobsCollection.findOne(query);
                if (result) {
                    application.title = result.title;
                    application.company = result.company;
                    application.company_logo = result.company_logo;
                    application.location = result.location
                }
            }

            res.send(result);
        })

        // delete my job
        app.delete('/job-applications/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await jobApplicationCollection.deleteOne(query);
            res.send(result);
        })

        // post my job
        app.post('/job-applications', async (req, res) => {
            const application = req.body;
            const result = await jobApplicationCollection.insertOne(application);

            // not the best way to send the job details(with job_id) with the application
            // aggregate the data
            const id = application.job_id;
            const query = { _id: new ObjectId(id) }
            const job = await jobsCollection.findOne(query);

            let newCount = 0;
            if (job.applicationCount) {
                newCount = job.applicationCount + 1
            } else {
                newCount = 1
            }

            // now update the doc info
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    applicationCount: newCount
                }
            }

            const updatedResult = await jobsCollection.updateOne(filter, updatedDoc);

            res.send(result);
        })

        // view who applied for my jobs
        // app.get('/job-applications/:id') => get a specific job application by id
        // but to view who applied for my jobs,
        app.get('/job-applications/jobs/:job_id', async (req, res) => {
            const jobId = req.params.job_id;
            const query = { job_id: jobId }
            const result = await jobApplicationCollection.find(query).toArray();
            res.send(result)
            // now check http://localhost:5000/job-applications/jobs/675d856b97a3ca475b9c6efd , here the id is job._id
            // now set the loader in the frontend router
        })

        // partial update the status of the applied job in view applications
        app.patch('/job-applications/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: data.status
                }
            }
            const result = await jobApplicationCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })




    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Job is falling from the sky.')
})


app.listen(port, () => {
    console.log(`Job is waiting at: ${port}`);
})


