import express from "express";
import cors from "cors";
import projectRoutes from "./routes/projects";
import workerRoutes from "./routes/workers";
import workLogRoutes from "./routes/work-logs";
import statsRoutes from "./routes/stats";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/work-logs', workLogRoutes);
app.use('/api/v1/stats', statsRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
