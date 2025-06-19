import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import orderRoutes from './routes/order';
import dispatcherRoutes from './routes/dispatcher';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/order', orderRoutes);
app.use('/dispatcher', dispatcherRoutes);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Express server running at port ${PORT}`);
});