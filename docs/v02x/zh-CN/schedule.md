<!-- title: 定时任务; order: 17 -->
# 基本概念

循环地执行一个定时任务由 [sfn-scheduler](https://github.com/hyurl/sfn-scheduler)
模块提供支持，它提供了你一个简单友好地接口来设置能够在特定时间或阶段执行的定时任务。

## 如何使用？

为了方便，你应该将定时任务文件存储在 `src/schedules/` 目录中，然后在启动自定义文件中
加载它们。

### 示例

```typescript
// src/schedules/index.ts
import { Schedule } from "sfn-scheduler";

var schedule1 = new Schedule("every 2 seconds", () => {
    console.log("This schedule runs every 2 seconds.");
});

var schedule2 = new Schedule("in 2 days", () => {
    console.log("This schedule has been waiting for 2 days.");
});

console.log(schedule2);

var schedule3 = new Schedule("20:00", () => {
    console.log("This schedule runs at 20:00 this evening.");
});

var schedule4 = new Schedule("*:30", () => {
    console.log("This schedule runs at 30 minutes of every hour in today.");
});

var schedule5 = new Schedule("*-*-1 8:00", () => {
    console.log("This schedule runs on every first day in every month.");
});
```

```typescript
// src/bootstrap/http.ts
import "../schedules/index";

// ...
```

## 时间表示

时间表示模式将会使用
[sfn-schedule-parser](https://github.com/hyurl/sfn-schedule-parser) 模块进行
解析， 它暴露了一个通用的 NodeJS API 来创建定时任务程序。关于所有支持的模式，你需要
跟进它以便获取最新的特性。

## 如何停止？

你可以在任何想要的时刻通过调用方法 `stop()` 来停止正在运行的定时任务。

```typescript
var schedule = new Schedule("runs every 2 minutes", () => {
    // ...
    schedule.stop();
});
```