import * as _ from "lodash";
import { CashMarginType, IOrder, OrderSide, OrderStatus } from "../types";
import { eRound } from "../util";
import BrokerApi from "./BrokerApi";
import { ICashMarginTypeStrategy } from "./types";

export default class MarginOpenStrategy implements ICashMarginTypeStrategy {
  constructor(private readonly brokerApi: BrokerApi) {}

  public async send(order: IOrder): Promise<void> {
    if (order.cashMarginType !== CashMarginType.MarginOpen) {
      throw new Error();
    }
    const request = {
      pair: "btc_jpy",
      order_type: this.getBrokerOrderType(order),
      amount: order.size,
      rate: order.price,
    };
    const reply = await this.brokerApi.newOrder(request);
    if (!reply.success) {
      throw new Error("Send failed.");
    }
    order.sentTime = reply.created_at;
    order.status = OrderStatus.New;
    order.brokerOrderId = reply.id;
    order.lastUpdated = new Date();
  }

  public async getBtcPosition(): Promise<number> {
    const positions = await this.brokerApi.getAllOpenLeveragePositions();
    const longPosition = _.sumBy(positions.filter((p) => p.side === "buy"), (p) => p.amount);
    const shortPosition = _.sumBy(positions.filter((p) => p.side === "sell"), (p) => p.amount);
    return eRound(longPosition - shortPosition);
  }

  private getBrokerOrderType(order: IOrder): string {
    switch (order.side) {
      case OrderSide.Buy:
        return "leverage_buy";
      case OrderSide.Sell:
        return "leverage_sell";
      default:
        throw new Error();
    }
  }
}
