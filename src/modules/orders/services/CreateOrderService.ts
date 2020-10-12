import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Product from '@modules/products/infra/typeorm/entities/Product';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) throw new AppError('Customer does not exist');

    const productsID = products.map(product => {
      return { id: product.id };
    });

    const currentProducts = await this.productsRepository.findAllById(
      productsID,
    );

    const updateProducts: Product[] = [];

    const ordersProducts = products.map(product => {
      const currentProduct = currentProducts.find(
        item => item.id === product.id,
      );

      if (!currentProduct) throw new AppError('Product does not exist');

      if (currentProduct.quantity < product.quantity)
        throw new AppError('There are not enough products');

      const updateProduct = currentProduct;
      updateProduct.quantity = currentProduct.quantity - product.quantity;

      updateProducts.push(currentProduct);

      return {
        product_id: product.id,
        price: currentProduct.price,
        quantity: product.quantity,
      };
    });

    const order = this.ordersRepository.create({
      customer,
      products: ordersProducts,
    });

    await this.productsRepository.updateQuantity(updateProducts);

    return order;
  }
}

export default CreateOrderService;
