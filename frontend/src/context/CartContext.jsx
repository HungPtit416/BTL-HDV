import { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);

    // Load cart từ localStorage khi component mount
    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            setCartItems(JSON.parse(savedCart));
        }
    }, []);

    // Cập nhật localStorage mỗi khi cart thay đổi
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
        calculateTotal();
    }, [cartItems]);

    const calculateTotal = () => {
        const total = cartItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        setTotalPrice(total);
    };

    const addToCart = (product, quantity = 1) => {
        const existingItem = cartItems.find(item => item.id === product.id);

        if (existingItem) {
            setCartItems(cartItems.map(item =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            ));
        } else {
            setCartItems([...cartItems, {
                id: product.id,
                title: product.title,
                price: parseFloat(product.price),
                image_url: product.image_url,
                quantity
            }]);
        }
    };

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setCartItems(cartItems.map(item =>
            item.id === productId
                ? { ...item, quantity }
                : item
        ));
    };

    const removeFromCart = (productId) => {
        setCartItems(cartItems.filter(item => item.id !== productId));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    return (
        <CartContext.Provider value={{
            cartItems,
            totalPrice,
            addToCart,
            updateQuantity,
            removeFromCart,
            clearCart
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};
