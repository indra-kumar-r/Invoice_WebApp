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
import { CommonModule, DatePipe } from '@angular/common';
import { GstService } from '../../core/services/gst/gst.service';
import { ToasterService } from '../../core/services/toaster/toaster.service';
import { GstDetails, GstInvoice } from '../../models/gst.model';
import { FormatDatePipe } from '../../core/pipes/format-date.pipe';
import { RoundNumberPipe } from '../../core/pipes/round-number.pipe';
import * as XLSX from 'xlsx';
import { CompanyDetails } from '../../models/shared.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gst',
  imports: [
    InputComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    FormatDatePipe,
    RoundNumberPipe,
  ],
  templateUrl: './gst.component.html',
  styleUrl: './gst.component.scss',
  providers: [RoundNumberPipe, DatePipe],
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

  companyDetails: CompanyDetails = environment.companyDetails;

  isLoading: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private gstService: GstService,
    private toasterService: ToasterService,
    private roundNumberPipe: RoundNumberPipe,
    private datePipe: DatePipe
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

  getMonthName(month: number): string {
    return new Date(2000, month - 1, 1).toLocaleString('en-US', {
      month: 'long',
    });
  }

  exportGst(): void {
    const monthName = this.getMonthName(this.month).toUpperCase();

    const title =
      `${this.companyDetails.name} GST NO ${this.companyDetails.gstin} ` +
      `SALES FOR THE MONTH OF ${monthName} - ${this.year}`;

    const worksheetData: any[][] = [];

    worksheetData.push([title]);

    worksheetData.push([
      'Date',
      'Company Name / Customer Name',
      'Invoice Number',
      'GST Number',
      'IGST @ 5%',
      'CGST @ 2.5%',
      'SGST @ 2.5%',
      'Gross Total',
      'Received Amount',
      'Received Date',
    ]);

    this.gstDetails.forEach((invoice) => {
      worksheetData.push([
        this.datePipe.transform(invoice.date, 'dd-MM-yyyy'),
        invoice.companyName,
        invoice.invoiceNo,
        invoice.companyGstNo,
        this.roundNumberPipe.transform(invoice.igst ?? 0),
        this.roundNumberPipe.transform(invoice.cgst ?? 0),
        this.roundNumberPipe.transform(invoice.sgst ?? 0),
        this.roundNumberPipe.transform(invoice.grandTotal),
        '',
        '',
      ]);
    });

    worksheetData.push([]);

    worksheetData.push([
      'TOTAL',
      '',
      '',
      '',
      this.roundNumberPipe.transform(this.totalIgst),
      this.roundNumberPipe.transform(this.totalCgst),
      this.roundNumberPipe.transform(this.totalSgst),
      this.roundNumberPipe.transform(this.totalAmount),
      '',
      '',
    ]);

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(worksheetData);

    worksheet['!merges'] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 9 },
      },
    ];

    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 35 },
      { wch: 18 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
    ];

    const workbook: XLSX.WorkBook = {
      Sheets: { GST: worksheet },
      SheetNames: ['GST'],
    };

    XLSX.writeFile(workbook, `GST_${monthName}_${this.year}.xlsx`);
  }
}
