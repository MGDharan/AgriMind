import { useEffect, useState } from 'react';
import { api, OrderResponse } from '../api/client';
import { GlassCard } from '../components/ui';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.listSellerOrders()
      .then(setOrders)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold">My Orders</h2>
        <p className="text-gray-500 mt-1">View buyer requests for your crop listings</p>
      </div>

      {loading ? (
        <GlassCard className="p-6">Loading orders...</GlassCard>
      ) : orders.length === 0 ? (
        <GlassCard className="p-6">No orders yet. Buyers will appear here after they place an order on your listings.</GlassCard>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <GlassCard key={order.id} className="p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{order.crop} order</h3>
                    <p className="text-sm text-gray-400">Listing #{order.listing_id} · ordered {order.quantity_kg} kg</p>
                  </div>
                  <div className="text-right text-sm text-gray-400">{new Date(order.created_at).toLocaleString()}</div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                  <div>
                    <div className="text-xs text-gray-500 uppercase">Buyer</div>
                    <div>{order.buyer_name}</div>
                    <div>{order.buyer_phone}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase">Address</div>
                    <div>{order.buyer_address}</div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                  <div>
                    <div className="text-xs text-gray-500 uppercase">List price</div>
                    <div>₹{order.price_per_kg}/kg</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase">Available qty</div>
                    <div>{order.listing_quantity_kg} kg</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
