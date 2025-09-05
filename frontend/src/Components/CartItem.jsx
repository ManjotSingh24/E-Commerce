// this is kind of cart card
import { Minus, Plus, Trash } from "lucide-react";
import { useCartStore } from "../store/useCartStore";

const CartItem = ({ item }) => {
  //my states

  const{ updateQuantity, removeFromCart } = useCartStore();
 

  return (
    <div className="rounded-lg border p-4 shadow-sm border-gray-700 bg-gray-800 md:p-6 flex items-center justify-between">
      {/* Left section: image + details */}
      <div className="flex items-center gap-4 ">
        {/* Product Image */}
        <img
          className="h-20 md:h-24 rounded object-cover"
          src={item.image}
          alt={item.name}
        />

        {/* Product details */}
        <div className="flex flex-col space-y-2">
          <p className="text-base font-medium text-white hover:text-emerald-400 hover:underline">
            {item.name}
          </p>
          <p className="text-sm text-gray-400">{item.description}</p>

          {/* Delete button */}
          <button
            className="inline-flex items-center text-sm font-medium text-red-400 hover:text-red-300 hover:underline"
            onClick={() => removeFromCart(item._id)}
          >
            <Trash />
          </button>
        </div>
      </div>

      {/* Right section: quantity controls + price */}
      <div className="flex items-center gap-6">
        {/* Quantity controls */}
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-600 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onClick={() => updateQuantity(item._id, item.quantity - 1)}
          >
            <Minus className="text-gray-300" />
          </button>
          <p className="text-gray-200">{item.quantity}</p>
          <button
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-600 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onClick={() => updateQuantity(item._id, item.quantity + 1)}
          >
            <Plus className="text-gray-300" />
          </button>
        </div>

        {/* Price */}
        <p className="text-base font-bold text-emerald-400">${item.price}</p>
      </div>
    </div>
  );
};


export default CartItem;
