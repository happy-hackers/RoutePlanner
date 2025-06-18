import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

router.get('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*");

  if (error) {
    res.status(500).json({ error: error.message });
  } else {
    // Remove create_time from each object
    const cleanedArray = data.map(({ created_time, ...rest }) => ({
      ...rest
    }));
    res.status(200).json(cleanedArray);
  }
});

router.post('/create-order', async (req: Request, res: Response) => {
  try {
    const newOrder = req.body;
    console.log("Received order:", newOrder);
    const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        date: newOrder.date,
        time: newOrder.time,
        state: newOrder.state,
        address: newOrder.address,
        lat: newOrder.lat,
        lng: newOrder.lng,
        postcode: newOrder.postcode,
        dispatcher_id: newOrder.dispatcherId
      }
    ])
    .select();
    
    if (error) {
      console.error('Insert error:', error)
      res.status(500).json({ error: error });
    } else {
      console.log('Inserted data:', data)
      const { created_time, ...cleanedJson } = data[0]; // Currently not need created_time column
      res.status(200).json({ message: 'Data inserted successfully', newOrder: cleanedJson });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all dispatchers
router.get('/dispatchers', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("dispatchers")
    .select("*");

  if (error) {
    res.status(500).json({ error: error.message });
  }

  res.status(200).json(data); // ✅ explicit and clear
});

router.get('/create-dispatcher', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('dispatchers').insert([
      {
        name: "Amy",
        active_day: ["Mon"],
        responsible_area: ["A", "B", "C"],
      }
    ]);
    
    if (error) {
      console.error('Insert error:', error)
    } else {
      console.log('Inserted data:', data)
    }
    res.status(200).json({ message: 'Data inserted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;