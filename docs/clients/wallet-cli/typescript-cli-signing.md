# TypeScript CLI 签名与安全

TypeScript CLI 支持软件账户、Ledger 账户和 watch-only 账户。软件密钥始终在本地加密保存，Ledger
密钥保留在设备上，watch-only 账户不能签名。

## 签名交易

`tx sign` 接受两种输入形式：

| 输入 | 用途 |
|------|------|
| `--transaction <json>` | 直接签名 JSON 交易。 |
| `--hex <hex>` / `--file <path>` | 向交易数据添加签名。 |

该命令只签名，不会广播。之后使用 `tx broadcast` 广播。

软件账户通过 stdin 提供密码：

```bash
printf '%s\n' "$WALLET_PASSWORD" |
  wallet-cli tx sign \
    --transaction "$TX_JSON" \
    --password-stdin
```

对于多签交易数据，已有签名会保留，所选账户再添加一个签名：

```bash
printf '%s\n' "$WALLET_PASSWORD" |
  wallet-cli tx sign \
    --file transaction.hex \
    --account cosigner \
    --network tron:nile \
    --out transaction.signed.hex \
    --password-stdin
```

对交易数据签名时，CLI 默认会在线检查所选权限和已有签名，并拒绝过期交易、未授权签名者或重复签名。
在与网络隔离的设备上使用 `--offline`，之后再通过 `tx approvals` 检查交易数据。

完整的协同签名流程见 [TypeScript CLI 多签](typescript-cli-multisig.md)。

## 签名前检查

wallet-cli 会在签名前验证交易表示。无法安全解码和验证的十六进制或文件形式的交易数据会被拒绝。

签名前务必确认发送方、接收方、金额、token 或合约、权限和过期时间。离线签名时，应通过可信渠道
传递交易数据，并且不要在签名者之间修改交易内容。

## 签名类型化数据

`typed-data sign` 用于签名 EIP-712/TIP-712 结构化数据：

```bash
printf '%s\n' "$WALLET_PASSWORD" |
  wallet-cli typed-data sign \
    --typed-data "$TYPED_DATA_JSON" \
    --password-stdin \
    --output json
```

载荷使用 `domain`、`types`、`primaryType` 和 `message`。地址字段接受 TRON Base58 地址。
`domain.chainId` 会按输入值参与签名，不会与 `--network` 比较，因此请仔细检查 domain 和 message。

## Ledger 账户

Ledger 账户支持交易和类型化数据签名。使用 Ledger 账户时，不要通过管道传入密码，也不要使用
`--password-stdin`。

签名类型化数据时，请在 Ledger TRON 应用中启用
**Settings > Sign by Hash > Allowed**。设备可能只显示哈希，而不会显示类型化数据的每个字段，因此
批准操作前应在主机上核对完整载荷。

其他操作可能要求在 TRON 应用中启用相应的交易或自定义合约签名设置。如果应用或设备无法签名某项
操作，wallet-cli 会返回包含处理建议的 Ledger 错误。

## 密码与敏感信息输入

Master password、助记词和私钥绝不会通过命令行参数或配置值接收。

软件账户签名必须使用 `--password-stdin`。没有显式交互式密码流程的命令在缺少密码标志时不会提示。

单次调用只能使用一个 stdin 标志：

| 标志 | 输入 |
|------|------|
| `--password-stdin` | 软件钱包 master password。 |
| `--tx-stdin` | `tx broadcast` 使用的交易 JSON。 |
| `--message-stdin` | `message sign` 使用的消息。 |

`import mnemonic`、`import private-key` 和 `change-password` 要求在真实终端中进行隐藏输入。

## 保护本地数据

- 钱包文件、备份和生成的密钥对包含敏感信息。请安全保存，不要共享。
- `config.yaml` 中的服务凭据在显示时会被隐藏。请保护配置文件。
- 已签名交易文件不包含私钥，但分享或广播前仍应检查其内容。
- 仅在受控的离线终端中使用 `--print-secret`。

所有选项和响应字段，请参见上游
[`tx sign`](https://github.com/tronprotocol/wallet-cli/blob/master/ts/docs/commands/tx/sign.md)、
[`tx approvals`](https://github.com/tronprotocol/wallet-cli/blob/master/ts/docs/commands/tx/approvals.md)
以及
[`typed-data sign`](https://github.com/tronprotocol/wallet-cli/blob/master/ts/docs/commands/typed-data/sign.md)
参考。
