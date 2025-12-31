import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../http/http.service';
import { GstApiRoutes } from '../../constants/api-routes-constants';
import { GstDetails } from '../../../models/gst.model';

@Injectable({
  providedIn: 'root',
})
export class GstService {
  constructor(private api: HttpService) {}

  getGstDetails(month: number, year: number): Observable<GstDetails> {
    const url = `${GstApiRoutes.GET}?month=${month}&year=${year}`;
    return this.api.get<GstDetails>(url);
  }
}
