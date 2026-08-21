# TypeScript / npm CLI

从 4.9.7 版本开始，`wallet-cli` 仓库同时提供 TypeScript CLI，并以 npm 包
`@tron-walletcli/wallet-cli` 发布。从 4.10.1 开始，npm 包版本与 wallet-cli 发布版本保持一致。

TypeScript CLI 与 Java JAR 相互独立，使用 `tx send` 等分组命令。它支持 TRON 主网、Nile 和 Shasta，
不支持 EVM 链。

## 安装

需要 Node.js 20 或更高版本。

```bash
npm install -g @tron-walletcli/wallet-cli
wallet-cli --version
wallet-cli --help
```

## 快速开始

创建钱包、选择钱包，并使用 Nile 进行测试：

```bash
wallet-cli create --label main
wallet-cli list
wallet-cli use main
wallet-cli config defaultNetwork tron:nile
wallet-cli account balance
```

使用 `--network` 可以只为一条命令临时指定网络：

```bash
wallet-cli account balance --network tron:nile
```

## 常用选项

| 选项 | 说明 |
|------|------|
| <code>--output text&#124;json</code>、<code>-o</code> | 选择文本或 JSON 输出。 |
| `--network` | 选择 `tron:mainnet`、`tron:nile` 或 `tron:shasta`。 |
| `--account` | 按 ID、标签或地址选择账户。 |
| `--wait` | 提交后轮询，直到出现最终状态或达到等待超时。 |
| `--password-stdin` | 从 stdin 读取软件钱包密码。 |

使用 `wallet-cli config` 查看或持久化默认值：

```bash
wallet-cli config
wallet-cli config waitTimeoutMs 90000
```

## 钱包和账户

钱包数据默认保存在 `~/.wallet-cli`。可以设置 `WALLET_CLI_HOME` 使用其他位置，例如隔离测试或
自动化数据。

```bash
wallet-cli create --label main
wallet-cli import mnemonic --label imported
wallet-cli import private-key --label hot
wallet-cli import watch --address T... --label treasury
wallet-cli import ledger --app tron --index 0 --label cold
wallet-cli list
wallet-cli use main
wallet-cli current
wallet-cli rename main --label primary
wallet-cli backup primary --out ~/primary-backup.json
wallet-cli change-password
```

助记词和私钥导入以及密码修改需要真实终端，并通过隐藏提示读取输入。这些敏感信息不能通过命令行参数传入。

对于没有交互式密码流程、需要签名或解密密钥的命令，软件账户必须通过 `--password-stdin` 提供
master password。备份既可以使用终端隐藏提示，也可以使用 `--password-stdin`。Ledger 账户不使用
`--password-stdin`。

为使后续命令清单保持简洁，签名示例可能省略密码管道和 `--password-stdin`。软件账户必须补上它们；
Ledger 账户则不能添加。

派生 HD 子账户时，传入 `wallet-cli list` 显示的 seed id：

```bash
printf '%s\n' "$WALLET_PASSWORD" |
  wallet-cli derive --seed-id wlt_ab12cd34 --label operations --password-stdin
```

使用 `wallet-cli delete` 删除账户。删除根 HD 钱包时，也会删除从中派生的账户。仅在明确希望跳过确认时
使用 `--yes`。

CLI 可以激活新地址，还可以设置所选账户的链上名称或 ID：

```bash
wallet-cli account activate --address TNewAddress... --network tron:nile --dry-run
wallet-cli account set --name "Acme Treasury" --network tron:nile --dry-run
wallet-cli account set --id acme-treasury-01 --network tron:nile --dry-run
```

`account activate` 会向所选账户收取当前的账户创建费。链上账户名称和 ID 都只能设置一次。这与
`rename` 不同，后者只修改可重复更改的本地标签。`account activate` 和 `account set --id` 不能由
Ledger 账户签名。提交前请先使用 `--dry-run` 检查这些操作。

## 交易

通过 `--amount` 传入的是人类可读金额。使用 `--raw-amount` 可传入 SUN 或 token 基础单位。

```bash
wallet-cli tx send --to T... --amount 1 --dry-run
wallet-cli tx send --to T... --token USDT --amount 5 --dry-run
wallet-cli tx send --to T... --contract TR7... --amount 5 --dry-run
wallet-cli tx send --to T... --asset-id 1002000 --raw-amount 1000000 --dry-run
```

交易构建命令支持四种模式：

| 模式 | 行为 |
|------|------|
| 默认 | 构建、签名并广播。 |
| `--dry-run` | 构建并估算，不签名、不广播。 |
| `--sign-only` | 构建并签名，不广播。 |
| `--build-only` | 构建交易，不签名，也不解锁钱包。 |

添加 `--wait` 后，CLI 会轮询，直到交易确认或失败。如果先达到等待超时，命令返回 `submitted`；
不使用 `--wait` 时，命令会在提交后立即返回。

广播先前签名的交易文件：

```bash
wallet-cli tx broadcast --file signed.hex --network tron:nile
wallet-cli tx status --txid <TXID>
wallet-cli tx info --txid <TXID> --output json
```

`tx sign` 的直接签名路径接受 JSON；为多签交易添加签名时，可以通过十六进制字符串或文件传入
交易数据：

```bash
wallet-cli tx sign --transaction "$TX_JSON"
wallet-cli tx approvals --file transaction.hex --network tron:nile
wallet-cli tx sign --file transaction.hex --out signed.hex --network tron:nile
```

使用十六进制或文件签名时，CLI 默认会在线检查所选权限和已有签名。在与网络隔离的签名设备上使用
`--offline`，之后再通过 `tx approvals` 检查结果。详见[多签](typescript-cli-multisig.md)和
[签名与安全](typescript-cli-signing.md)。

## 权限与多签

TRON 权限由带权重的签名密钥和阈值组成。创建交易前先查看当前权限，并在签名任何权限替换交易前
进行试运行：

```bash
wallet-cli permission show --account main --network tron:nile
wallet-cli permission update --file permissions.json --network tron:nile --dry-run
wallet-cli tx approvals --file transaction.hex --network tron:nile
```

`permission update` 会替换完整的权限结构，并收取当前链上权限更新费。错误的 owner 权限可能会永久
锁定账户。

可选的 `tx multisig` 命令使用 TronLink 服务协调签名。该服务并非必需；签名者也可以直接交换交易
文件。这两种工作流详见[多签](typescript-cli-multisig.md)。

## 查询

与钱包绑定的查询默认使用活动账户，也可以通过 `--account` 选择其他账户。

```bash
wallet-cli account info --output json
wallet-cli account history --limit 10
wallet-cli account portfolio
wallet-cli networks
wallet-cli block 12345
wallet-cli chain params
wallet-cli chain prices
wallet-cli chain node
wallet-cli stake info
wallet-cli vote status
wallet-cli reward balance
```

所有支持的选项和响应字段，请参见
[上游命令参考](https://github.com/tronprotocol/wallet-cli/tree/master/ts/docs/commands)。

## Token 和合约

Token 地址簿包含常用主网 token，也支持自定义 TRC-20 合约。

```bash
wallet-cli token add --contract TR7...
wallet-cli token list
wallet-cli token balance --contract TR7...
wallet-cli token info --contract TR7...
wallet-cli token remove --contract TR7...
```

合约调用使用 JSON 编码的参数：

```bash
wallet-cli contract info --contract TR7...

wallet-cli contract call \
  --contract T... \
  --method 'balanceOf(address)' \
  --params '[{"type":"address","value":"T..."}]'

wallet-cli contract send \
  --contract T... \
  --method 'transfer(address,uint256)' \
  --params '[{"type":"address","value":"T..."},{"type":"uint256","value":"1000000"}]' \
  --dry-run

wallet-cli contract deploy \
  --abi '[...]' \
  --bytecode 60... \
  --fee-limit 1000000000 \
  --params '[100,"T..."]' \
  --dry-run
```

签名或广播合约部署交易需要软件账户。Ledger 账户可以使用 `--dry-run` 或 `--build-only`，因为这两种
模式不会签名。

## GasFree 转账

GasFree 可以在账户没有 TRX 的情况下转移受支持的 token，服务费从转移的 token 中收取。

```bash
wallet-cli gasfree info --network tron:nile
wallet-cli gasfree transfer --to T... --amount 25 --token USDT --network tron:nile --dry-run
wallet-cli gasfree trace <TRACE_ID> --network tron:nile
```

GasFree 支持主网和 Nile，并要求配置服务凭据。提交请求后会返回 GasFree trace id；可以通过 `--wait`
或 `gasfree trace` 跟踪。详见 [TypeScript CLI GasFree](typescript-cli-gasfree.md)。

## Stake 2.0

质押金额以 SUN 为单位。

```bash
wallet-cli stake freeze --amount-sun 1000000 --resource energy --dry-run
wallet-cli stake delegate --amount-sun 1000000 --receiver T... --resource energy --dry-run
wallet-cli stake undelegate --amount-sun 1000000 --receiver T... --resource energy --dry-run
wallet-cli stake unfreeze --amount-sun 1000000 --resource energy --dry-run
wallet-cli stake cancel-unfreeze --dry-run
wallet-cli stake withdraw --dry-run
wallet-cli stake info
wallet-cli stake delegated --direction out
```

签名或广播 `stake cancel-unfreeze` 需要软件账户。Ledger 账户可以使用 `--dry-run` 或
`--build-only`，因为这两种模式不会签名。

## 投票和奖励

```bash
wallet-cli vote list
wallet-cli vote status
wallet-cli vote cast --for TZ4...=600 --for TT5...=400
wallet-cli reward balance
wallet-cli reward withdraw
```

`vote cast` 会替换完整的投票分配，因此未列出的超级代表将不再获得投票。对 `vote cast` 或
`reward withdraw` 进行签名或广播需要软件账户或 Ledger 账户；`--dry-run` 和 `--build-only` 不会签名。

## 本地工具

```bash
wallet-cli contact add alice T... --note "Alice mainnet"
wallet-cli contact list
wallet-cli tx send --to alice --amount 1 --network tron:nile --dry-run
wallet-cli contact remove alice

wallet-cli address generate --out ./generated-keypair.json
wallet-cli encoding convert T...
wallet-cli current --qr
```

联系人保存在本地，可以作为 `tx send` 和 `gasfree transfer` 的收款方。`address generate` 会创建
密钥对，但不会将其导入钱包。请保护生成的私钥文件，并且只在受控的离线终端中使用
`--print-secret`。

## 签名

CLI 支持消息、交易以及 EIP-712/TIP-712 类型化数据签名。软件账户和 Ledger 账户可以签名；
watch-only 账户不能签名。

```bash
wallet-cli message sign --message 'hello'
wallet-cli tx sign --transaction "$TX_JSON"
wallet-cli typed-data sign --typed-data "$TYPED_DATA_JSON"
```

有关密码输入、Ledger 设置、离线签名和交易检查，请参见[签名与安全](typescript-cli-signing.md)。

## 自动化

JSON 输出使用单个 `wallet-cli.result.v1` 信封。退出码保持稳定：

| 代码 | 含义 |
|------|------|
| `0` | 命令成功完成。 |
| `1` | 发生运行时错误或执行失败。 |
| `2` | 命令用法、输入或配置错误。 |

对于使用 `--wait` 的命令，请检查 `data.stage`：`"confirmed"` 和 `"failed"` 是最终结果，
`"submitted"` 不是最终结果。

脚本可以发现命令和 JSON Schema，而无需解析面向用户的帮助文本：

```bash
wallet-cli --json-schema
wallet-cli tx send --json-schema
```
