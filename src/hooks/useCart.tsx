import { stringify } from "querystring";
import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];

      const product = newCart.find((product) => product.id === productId);

      const productStock = await api
        .get(`/stock/${productId}`)
        .then((response) => response.data.amount);
      const productRequestedStock = product ? product.amount : 0;

      if (productStock < productRequestedStock + 1) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (product) {
        product.amount = productRequestedStock + 1;
      } else {
        await api.get(`/products/${productId}`).then((response) => {
          response.data.amount = 1;
          newCart.push(response.data);
        });
      }

      setCart([...newCart]);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (error) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((product) => product.id === productId);

      if (product) {
        const newCart = cart.filter((product) => product.id !== productId);
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get(`/stock/${productId}`);

      const productStock = stock.data.amount;

      if (amount > productStock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = [...cart];
      const product = newCart.find((product) => product.id === productId);

      if (product) {
        product.amount = amount;
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
