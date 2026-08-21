# TypeScript CLI GasFree

GasFree 允许账户在没有 TRX 的情况下转移受支持的 token。GasFree 服务负责提交转账，并从转移的
token 中收取服务费。

该工作流与 [Java CLI GasFree](gasfree.md) 中介绍的 Java 命令相互独立。

## 配置服务

GasFree 支持 TRON 主网和 Nile，不支持 Shasta。请为所选主网或测试网环境配置凭据：

```bash
wallet-cli config gasfreeApiKey '<api-key>'
wallet-cli config gasfreeApiSecret '<api-secret>'
```

显示配置时，API 凭据会被隐藏。请保护 `config.yaml`；在 POSIX 系统上，如果包含该凭据的
配置文件权限不安全，wallet-cli 会拒绝使用。

## 获取 GasFree 地址和费用

GasFree 服务会为每个钱包账户提供一个专属地址。用于该工作流的 token 必须发送到这个地址，而不是
账户的普通 TRON 地址。

查询地址、激活状态、支持的 token 和当前费用：

```bash
wallet-cli gasfree info --account main --network tron:nile
```

服务会收取：

- 每笔转账的服务费；
- 未激活 GasFree 地址首次转出时的一次性激活费。

两项费用都使用转账 token 支付，并计入所需总额。费用和支持的 token 可能变化，因此应在转账前立即
查询或试运行。

## 预览和提交转账

使用 `--dry-run` 检查费用，并确认 GasFree 地址中的 token 余额是否充足：

```bash
wallet-cli gasfree transfer \
  --to TRecipient... \
  --amount 25 \
  --token USDT \
  --network tron:nile \
  --dry-run
```

余额必须能够支付接收方金额、服务费以及可能产生的激活费。

检查结果后，再签名并提交：

```bash
printf '%s\n' "$WALLET_PASSWORD" |
  wallet-cli gasfree transfer \
    --to TRecipient... \
    --amount 25 \
    --token USDT \
    --network tron:nile \
    --password-stdin
```

`--to` 也接受通过 `contact add` 保存的名称。

Ledger 账户支持 GasFree 签名。使用 Ledger 账户时不要传入 `--password-stdin`，并在 Ledger TRON
应用中启用 **Settings > Sign by Hash > Allowed**。

GasFree 不支持 `--sign-only` 或 `--build-only`。其授权会提交给 GasFree 服务，而不是像普通交易
那样以签名交易数据的形式广播。

## 跟踪转账

提交操作返回 GasFree `traceId`，而不是链上交易 ID。转账可能仍在等待服务或网络处理：

```bash
wallet-cli gasfree trace <TRACE_ID> --network tron:nile
```

也可以为 `gasfree transfer` 添加 `--wait`。

服务通过 `WAITING`、`INPROGRESS` 和 `CONFIRMING` 报告进度，`SUCCEED` 和 `FAILED`
是最终状态。轮询时可能跳过中间状态。

不要把 GasFree trace id 传给 `tx status`。应继续使用 `gasfree trace`，直到服务返回最终状态。
服务提交交易后，响应中才会出现链上交易 ID。

自动化程序应检查返回的 `state` 或 `stage`。状态查询本身成功，并不代表转账一定成功。

## 检查清单

- 使用 `gasfree info` 获取正确的收款地址和当前费用。
- 分开保管主网和 Nile 凭据。
- 发送前立即进行试运行。
- 确认余额能够支付金额和全部费用。
- 在请求达到最终状态之前，将已提交请求视为待处理。
- 在主网上签名前，确认接收方、token、金额和费用。

所有选项和响应字段，请参见上游
[`gasfree info`](https://github.com/tronprotocol/wallet-cli/blob/master/ts/docs/commands/gasfree/info.md)、
[`gasfree transfer`](https://github.com/tronprotocol/wallet-cli/blob/master/ts/docs/commands/gasfree/transfer.md)
以及
[`gasfree trace`](https://github.com/tronprotocol/wallet-cli/blob/master/ts/docs/commands/gasfree/trace.md)
参考。
