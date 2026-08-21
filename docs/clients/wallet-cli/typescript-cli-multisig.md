# TypeScript CLI 多签

TypeScript CLI 可以查看和替换账户权限、为所选权限构建交易、收集带权重的签名，并在达到阈值后
广播交易。

签名者可以直接交换交易文件，也可以使用可选的 TronLink 多签服务。

## 权限与费用

一个 TRON 账户可以拥有：

- 一个 owner 权限，ID 为 `0`；
- 一个可选的 witness 权限，ID 为 `1`；
- 最多八个 active 权限，ID 为 `2`–`9`。

每个权限最多可以包含五个密钥。每个密钥都有权重，签名的合计权重必须达到该权限的阈值。

有两项链上费用与多签尤其相关：

- 替换账户权限结构目前在主网上收取 **100 TRX**；
- 广播包含多个签名的交易目前在主网上额外收取 **1 TRX**。

这些都是可能变化的链参数，wallet-cli 会在运行时读取当前值。

## 查看和更新权限

创建或签名交易前先查看账户权限：

```bash
wallet-cli permission show --account main --network tron:nile
wallet-cli permission show --account main --network tron:nile --output json
```

`permission update` 会替换完整的权限结构。先导出当前结构，只修改需要变更的字段，然后对替换操作
进行试运行：

```bash
wallet-cli permission show --account main --network tron:nile --output json |
  jq '.data' > permissions.json

$EDITOR permissions.json

wallet-cli permission update \
  --file permissions.json \
  --account main \
  --network tron:nile \
  --dry-run
```

请保留不准备修改的字段，并检查完整的试运行结果。修改允许执行的操作时，请遵循上游
[`permission` 参考](https://github.com/tronprotocol/wallet-cli/tree/master/ts/docs/commands/permission)，
因为相关字段必须保持一致。如果 `permission show` 报告未知操作，除非能够保留其位图，否则不要
修改该 active 权限。检查密钥、权重、阈值、允许执行的操作和费用后，再提交更新：

```bash
printf '%s\n' "$WALLET_PASSWORD" |
  wallet-cli permission update \
    --file permissions.json \
    --account main \
    --network tron:nile \
    --wait \
    --password-stdin
```

!!! danger
    权限更新可能永久锁定账户，且链上没有恢复机制。请确认新的 owner 权限包含预期密钥，并且现有
    签名者能够达到其阈值。

## 交换交易文件

直接交换文件的工作流不需要外部协作服务。

### 1. 创建第一个交易文件

选择权限，为协同签名预留足够时间，并创建第一个签名：

```bash
printf '%s\n' "$WALLET_PASSWORD" |
  wallet-cli tx send \
    --to TRecipient... \
    --amount 1000 \
    --permission-id 2 \
    --sign-only \
    --expiration 86400000 \
    --network tron:nile \
    --password-stdin \
    --output text > transaction.hex
```

交易默认约 60 秒后过期。手动收集签名时，应设置足以让所有签名者完成操作的过期时间，最长 24 小时。
如果第一个签名者在其他机器上，请使用 `--build-only`，而不是 `--sign-only`。

### 2. 检查签名

```bash
wallet-cli tx approvals --file transaction.hex --network tron:nile
```

该命令会显示权限、已签名者、累计权重、缺少的权重和过期时间。过期交易仍可查看，但不能继续签名或
广播。

### 3. 添加签名

每位签名者使用上一位签名者生成的最新文件：

```bash
printf '%s\n' "$COSIGNER_PASSWORD" |
  wallet-cli tx sign \
    --file transaction.hex \
    --account cosigner \
    --network tron:nile \
    --out transaction.signed.hex \
    --password-stdin
```

在线签名会检查签名者是否属于该权限，并拒绝重复签名。在与网络隔离的机器上添加 `--offline`，之后再
通过 `tx approvals` 检查交易文件。

### 4. 验证并广播

当 `thresholdReached` 为 true 时，验证并广播最终交易文件：

```bash
wallet-cli tx broadcast --file transaction.signed.hex --network tron:nile --dry-run
wallet-cli tx broadcast --file transaction.signed.hex --network tron:nile --wait
```

wallet-cli 会拒绝过期交易或签名权重低于阈值的交易。

## 使用 TronLink 服务

`tx multisig` 可以保存交易、协调签名并通知协同签名者。请配置与所选主网或测试网环境匹配的凭据：

```bash
wallet-cli config tronlinkSecretId '<secret-id>'
wallet-cli config tronlinkSecretKey '<secret-key>'
wallet-cli config tronlinkChannel '<channel>'
```

构建未签名交易文件并创建签名集合：

```bash
wallet-cli tx send \
  --to TRecipient... \
  --amount 1000 \
  --permission-id 2 \
  --build-only \
  --expiration 86400000 \
  --network tron:nile \
  --output text > transaction.unsigned.hex

printf '%s\n' "$WALLET_PASSWORD" |
  wallet-cli tx multisig \
    --create \
    --file transaction.unsigned.hex \
    --network tron:nile \
    --password-stdin
```

创建签名集合时会添加发起人的第一个签名。其他签名者可以列出请求，并按交易 ID 签名：

```bash
wallet-cli tx multisig --account cosigner --network tron:nile

printf '%s\n' "$COSIGNER_PASSWORD" |
  wallet-cli tx multisig \
    --sign <TX_ID> \
    --account cosigner \
    --network tron:nile \
    --password-stdin
```

使用 `tx multisig --watch` 接收通知。达到阈值后，服务会自动广播。尝试手动广播前，请先确认交易
已经上链。

## 安全检查清单

- 选择或修改权限前，先查看当前权限。
- 对完整的权限替换操作进行试运行并检查结果。
- 只把最新交易文件传给下一位签名者；修改交易会使之前的签名失效。
- 选择足够完成签名收集、但不超过必要时长的过期时间。
- 检查 `thresholdReached`，而不是签名数量，因为不同密钥的权重可能不同。
- 在主网上签名或广播前，确认接收方、金额、权限和费用。

所有选项和响应字段，请参见上游
[`permission`](https://github.com/tronprotocol/wallet-cli/tree/master/ts/docs/commands/permission)、
[`tx sign`](https://github.com/tronprotocol/wallet-cli/blob/master/ts/docs/commands/tx/sign.md)、
[`tx approvals`](https://github.com/tronprotocol/wallet-cli/blob/master/ts/docs/commands/tx/approvals.md)、
[`tx multisig`](https://github.com/tronprotocol/wallet-cli/blob/master/ts/docs/commands/tx/multisig.md)
以及
[`tx broadcast`](https://github.com/tronprotocol/wallet-cli/blob/master/ts/docs/commands/tx/broadcast.md)
参考。
