import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'roundNumber',
})
export class RoundNumberPipe implements PipeTransform {
  transform(value: number): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return Math.round(value);
  }
}
