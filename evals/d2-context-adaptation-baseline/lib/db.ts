export interface Product {
  id: string;
  name: string;
  price: number;
}

export async function getProducts(category: string): Promise<Product[]> {
  return [
    { id: '1', name: `${category} Widget`, price: 29.99 },
    { id: '2', name: `${category} Gadget`, price: 49.99 },
    { id: '3', name: `${category} Tool`, price: 19.99 },
  ];
}
