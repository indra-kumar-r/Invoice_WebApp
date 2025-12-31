import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { InputComponent } from '../../shared/input/input.component';
import { catchError, finalize, of, Subject, takeUntil, tap } from 'rxjs';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GstService } from '../../core/services/gst/gst.service';
import { ToasterService } from '../../core/services/toaster/toaster.service';
import { GstDetails, GstInvoice } from '../../models/gst.model';
import { FormatDatePipe } from '../../core/pipes/format-date.pipe';

@Component({
  selector: 'app-gst',
  imports: [
    InputComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    FormatDatePipe,
  ],
  templateUrl: './gst.component.html',
  styleUrl: './gst.component.scss',
})
export class GstComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Output() close = new EventEmitter<void>();

  gstForm!: FormGroup;

  gstDetails: GstInvoice[] = [];
  month!: number;
  year!: number;

  totalIgst: number = 0;
  totalSgst: number = 0;
  totalCgst: number = 0;
  totalAmount: number = 0;

  isLoading: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private gstService: GstService,
    private toasterService: ToasterService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.gstForm = this.formBuilder.group({
      date: [new Date(), Validators.required],
    });
  }

  getControl(controlName: string): FormControl {
    return this.gstForm.get(controlName) as FormControl;
  }

  fetchGstDetails(): void {
    this.isLoading = true;

    const month = this.gstForm.get('date')?.value.getMonth() + 1;
    const year = this.gstForm.get('date')?.value.getFullYear();

    this.gstService
      .getGstDetails(month, year)
      .pipe(
        tap((res: GstDetails) => {
          this.month = res.month;
          this.year = res.year;
          this.gstDetails = res.data;

          this.calculateTotals(res.data);
        }),
        catchError((err) => {
          console.error('Error fetching GST details: ', err);
          this.toasterService.toast('Error fetching GST details.');
          return of([]);
        }),
        finalize(() => (this.isLoading = false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private calculateTotals(invoices: GstInvoice[]): void {
    this.totalIgst = 0;
    this.totalCgst = 0;
    this.totalSgst = 0;
    this.totalAmount = 0;

    for (const invoice of invoices) {
      this.totalIgst += invoice.igst ?? 0;
      this.totalCgst += invoice.cgst ?? 0;
      this.totalSgst += invoice.sgst ?? 0;
      this.totalAmount += invoice.grandTotal ?? 0;
    }
  }

  onClose(): void {
    this.resetState();
    this.close.emit();
  }

  resetState(): void {
    this.gstDetails = [];
    this.month = 0;
    this.year = 0;

    this.totalIgst = 0;
    this.totalCgst = 0;
    this.totalSgst = 0;
    this.totalAmount = 0;

    this.isLoading = false;

    this.gstForm.reset({
      date: new Date(),
    });
  }
}
