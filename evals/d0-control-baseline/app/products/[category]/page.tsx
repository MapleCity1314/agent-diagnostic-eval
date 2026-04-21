import { ProductList } from '../../../components/ProductList';

type Props = { params: Promise<{ category: string }> };

export default async function ProductsPage({ params }: Props) {
  const { category } = await params;
  return (
    <main>
      <h1>{category} Products</h1>
      <ProductList category={category} />
    </main>
  );
}
