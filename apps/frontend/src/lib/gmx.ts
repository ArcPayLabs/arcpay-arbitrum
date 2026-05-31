export const GMX_ARBITRUM_SEPOLIA = {
  chainId: 421614,
  network: "arbitrum-sepolia",
  explorer: "https://sepolia.arbiscan.io",
  docs: "https://docs.gmx.io/docs/api/contracts/addresses/",
  sdkDocs: "https://docs.gmx.io/docs/sdk/v1/",
  source: "GMX docs list Arbitrum Sepolia as the current testnet deployment and note that testnet contracts can change.",
  contracts: {
    DataStore: "0xCF4c2C4c53157BcC01A596e3788fFF69cBBCD201",
    RoleStore: "0x433E3C47885b929aEcE4149E3c835E565a20D95c",
    Reader: "0x4750376b9378294138Cf7B7D69a2d243f4940f71",
    ExchangeRouter: "0xEd50B2A1eF0C35DAaF08Da6486971180237909c3",
    Router: "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2",
    Oracle: "0x0dC4e24C63C24fE898Dda574C962Ba7Fbb146964",
    OrderVault: "0x1b8AC606de71686fd2a1AEDEcb6E0EFba28909a2",
    DepositVault: "0x809Ea82C394beB993c2b6B0d73b8FD07ab92DE5A",
    WithdrawalVault: "0x7601c9dBbDCf1f5ED1E7Adba4EFd9f2cADa037A5",
    ShiftVault: "0x6b6F9B7B9a6b69942DAE74FB95E694ec277117af",
    OrderHandler: "0x000F692690F6C39660AfB878D277f038fb3a8eC6",
    DepositHandler: "0xdD0228e2806A348209F777c82C90515f9da1b790",
    WithdrawalHandler: "0x039Ddee97368eb6ed20CE921dE7AD37A92A1A566",
    LiquidationHandler: "0x268FA5c1dafeefd5E7Bc31CF517c780cb36E7a84",
    EventEmitter: "0xa973c2692C1556E1a3d478e745e9a75624AEDc73",
    MarketFactory: "0x1934838E3d85416A6cF5bF7A5E619f12BE01C4b2",
    GlvRouter: "0x21b044Bb4a2Ba667723aA3d15ba7b4bCc628084D",
    GlvReader: "0x9B7D08AB020D9c180E4bAc370fB545317124Cf22",
    SubaccountRouter: "0xCF45A7E8bB46738f454eC6766631E5612DA90836",
    Multicall3: "0xD84793ae65842fFac5C20Ab8eaBD699ea1FC79F3",
  },
  sdk: {
    package: "@gmx-io/sdk",
    chainId: 421614,
    requiredInputs: ["rpcUrl", "oracleUrl", "subsquidUrl", "walletClient"],
    supportedMethods: ["createSwapOrder", "createIncreaseOrder", "createDecreaseOrder", "cancelOrders"],
  },
  markets: [
    { label: "ETH/USD hedge", indexToken: "WETH", longToken: "WETH", shortToken: "USDC", risk: "medium" },
    { label: "USDC runway swap", indexToken: "USDC", longToken: "USDC", shortToken: "ETH", risk: "low" },
    { label: "Manual GMX order", indexToken: "operator-selected", longToken: "operator-selected", shortToken: "operator-selected", risk: "requires review" },
  ],
} as const;

export function gmxExplorerUrl(address: string) {
  return `${GMX_ARBITRUM_SEPOLIA.explorer}/address/${address}`;
}
