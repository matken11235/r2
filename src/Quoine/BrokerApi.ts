import * as jwt from "jsonwebtoken";
import { nonce, safeQueryStringStringify } from "../util";
import WebClient from "../WebClient";
import {
  AccountBalance,
  AccountBalanceResponse,
  CancelOrderResponse,
  CloseAllResponse,
  ClosingTrade,
  ISendOrderRequest,
  OrdersResponse,
  PriceLevelsResponse,
  SendOrderResponse,
  TradingAccount,
  TradingAccountsResponse,
} from "./types";

export default class BrokerApi {
  private readonly baseUrl = "https://api.liquid.com";
  private readonly webClient: WebClient = new WebClient(this.baseUrl);

  constructor(private readonly key: string, private readonly secret: string) {}

  public async sendOrder(request: ISendOrderRequest): Promise<SendOrderResponse> {
    const path = "/orders/";
    return new SendOrderResponse(await this.post<SendOrderResponse, ISendOrderRequest>(path, request));
  }

  public async cancelOrder(id: string): Promise<CancelOrderResponse> {
    const path = `/orders/${id}/cancel`;
    return await this.put<CancelOrderResponse>(path);
  }

  public async getOrders(id: string): Promise<OrdersResponse> {
    const path = `/orders/${id}`;
    return new OrdersResponse(await this.get<OrdersResponse>(path));
  }

  public async getTradingAccounts(): Promise<TradingAccountsResponse> {
    const path = "/trading_accounts";
    const response = await this.get<TradingAccountsResponse>(path);
    return response.map((x) => new TradingAccount(x));
  }

  public async getAccountBalance(): Promise<AccountBalanceResponse> {
    const path = "/accounts/balance";
    const response = await this.get<AccountBalanceResponse>(path);
    return response.map((x) => new AccountBalance(x));
  }

  public async getPriceLevels(): Promise<PriceLevelsResponse> {
    const path = "/products/5/price_levels";
    return new PriceLevelsResponse(await this.webClient.fetch<PriceLevelsResponse>(path, undefined, false));
  }

  public async closeAll(): Promise<CloseAllResponse> {
    const path = "/trades/close_all";
    const response = await this.put<CloseAllResponse>(path);
    return response.map((x) => new ClosingTrade(x));
  }

  private async call<R>(path: string, method: string, body: string = ""): Promise<R> {
    const n = nonce();
    const payload = {
      nonce: n,
      path,
      token_id: this.key,
    };
    const sign = jwt.sign(payload, this.secret);
    const headers = {
      "Content-Type": "application/json",
      "X-Quoine-API-Version": "2",
      "X-Quoine-Auth": sign,
    };
    const init = { method, headers, body };
    return await this.webClient.fetch<R>(path, init);
  }

  private async post<R, T>(path: string, requestBody: T): Promise<R> {
    const method = "POST";
    const body = JSON.stringify(requestBody);
    return await this.call<R>(path, method, body);
  }

  private async get<R, T = never>(path: string, requestParam?: T): Promise<R> {
    const method = "GET";
    let pathWithParam = path;
    if (requestParam) {
      const param = safeQueryStringStringify(requestParam);
      pathWithParam += `?${param}`;
    }
    return await this.call<R>(pathWithParam, method);
  }

  private async put<R>(path: string): Promise<R> {
    const method = "PUT";
    return await this.call<R>(path, method);
  }
}
