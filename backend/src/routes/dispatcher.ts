import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface DispatcherUpdate {
  id: number;
  name: string;
  activeDay: string[];
  responsibleArea: string[];
}
// Get all dispatchers
router.get('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("dispatchers")
    .select("*");

  if (error) {
    res.status(500).json({ error: error.message });
  } else {
    // Remove create_time from each object and change the key to "activeDay"
    const cleanedArray = data.map(({ created_time, active_day, ...rest }) => ({
      ...rest,
      activeDay: active_day,
    }));
    res.status(200).json(cleanedArray);
  }
});
  
  router.put('/set-dispatchers', async (req: Request, res: Response) => {
    try {
      const updates: DispatcherUpdate[] = req.body;
      const cleanedUpdates = updates.map(({ activeDay, ...rest }) => ({
        ...rest,
        active_day: activeDay,
      }));
      const results = [];
      const errors = [];
      for (const item of cleanedUpdates) {
        const {id, ...fieldsToUpdate } = item;
        const { data, error } = await supabase
          .from('dispatchers')
          .update(fieldsToUpdate)
          .eq('id', id);
        if (error) {
          res.status(500).json({ error: `Error updating ID ${id}: ${error.message}` })
          errors.push({ id, error: error.message })
        } else {
          results.push(data);
        }
      }
      if (errors.length > 0) {
        res.status(207).json({
          message: 'Partial success',
          successful: results,
          failed: errors
        })
      } else {
        res.status(200).json({
          message: 'All updates successful',
          updatedData: results
        })
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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