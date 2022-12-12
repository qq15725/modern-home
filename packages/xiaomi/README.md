<h1 align="center">@homeiot/xiaomi</h1>

<p align="center">
  <a href="https://github.com/qq15725/homeiot/blob/master/LICENSE" class="mr-3">
    <img src="https://img.shields.io/npm/l/homeiot.svg" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/@homeiot/xiaomi">
    <img src="https://img.shields.io/npm/v/@homeiot/xiaomi.svg" alt="Version">
  </a>
  <a href="https://cdn.jsdelivr.net/npm/@homeiot/xiaomi/dist/index.js">
    <img src="https://img.shields.io/bundlephobia/minzip/@homeiot/xiaomi" alt="Minzip">
  </a>
</p>

<p align="center"><a href="README.md">README</a> | <a href="README_zh.md">中文文档</a></p>

<p align="center">XiaoMi LAN control SDK for Node.js</p>

## Installation

```shell
pnpm add @homeiot/xiaomi
```

## Usage

### Discover device

```ts
import { Discovery } from '@homeiot/xiaomi'

const log = console

new Discovery()
  .on('started', () => log.debug('Discovery Started'))
  .on('error', err => log.error(err))
  .on('discovered', device => log.debug(device))
  .start()
  .catch(err => log.error(err))
```

## Official documentation

[Xiaomi Mi Home Binary Protocol](https://github.com/OpenMiHome/mihome-binary-protocol/blob/master/doc/PROTOCOL.md)