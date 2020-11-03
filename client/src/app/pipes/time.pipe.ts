import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'time',
})
export class TimePipe implements PipeTransform {
  transform(time: number, ...args: unknown[]): unknown {
    if (!time) {
      time = 0;
    }

    const minute = 60 * 1000;
    const minutes = Math.floor(time / minute);
    const seconds = Math.floor(((time - minutes * minute) % minute) / 1000);
    const secondsString = this.padLeft(seconds, 2);
    return `${minutes}:${secondsString}`;
  }

  padLeft(value: number, length: number, pad: string = '0'): string {
    return (Array(length).join(pad) + value).slice(-length);
  }
}
