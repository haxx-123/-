import { createClient } from '@supabase/supabase-js';

// Configuration from user input - Hardcoded as requested
export const SUPABASE_URL = 'https://stockwise.art/api';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYWt3YnhrZnRva2ZkeXFkcm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDM4NDAsImV4cCI6MjA4MTQ3OTg0MH0.2Stwx6UV3Tv9ZpQdoc2_FEqyyLO8e2YDBmzIcNiIEfk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: Force sync product quantities (Big/Small) based on current batches
// This ensures the `products` table fields are always accurate after any operation.
export const syncProductStock = async (productId: string) => {
  try {
    // 1. Get real-time total from batches
    const { data: batches } = await supabase.from('batches').select('total_quantity').eq('product_id', productId);
    const total = batches?.reduce((sum, b) => sum + (Number(b.total_quantity) || 0), 0) || 0;

    // 2. Get current rate
    const { data: product } = await supabase.from('products').select('conversion_rate').eq('id', productId).single();
    const rate = product?.conversion_rate || 10;
    const safeRate = rate === 0 ? 10 : rate;

    // 3. Update product cache fields
    await supabase.from('products').update({
      quantity_big: Math.floor(total / safeRate),
      quantity_small: total % safeRate
    }).eq('id', productId);
  } catch (err) {
    console.error("Sync Stock Failed:", err);
  }
};