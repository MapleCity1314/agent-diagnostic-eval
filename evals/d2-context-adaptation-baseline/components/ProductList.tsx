import { getProducts } from '../lib/db';

interface Props {
  category: string;
}

export async function ProductList({ category }: Props) {
  const products = await getProducts(category);

  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          {product.name} — ${product.price}
        </li>
      ))}
    </ul>
  );
}
