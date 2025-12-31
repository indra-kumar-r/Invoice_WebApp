import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  HostListener,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { InvoiceService } from '../../../core/services/invoice/invoice.service';
import {
  Invoice,
  InvoiceFilters,
  InvoiceQuery,
  InvoiceResponse,
} from '../../../models/invoice.mode';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Company } from '../../../models/company.model';
import { CompanyService } from '../../../core/services/company/company.service';
import {
  Subject,
  debounceTime,
  takeUntil,
  tap,
  catchError,
  of,
  finalize,
} from 'rxjs';
import { FormatDatePipe } from '../../../core/pipes/format-date.pipe';
import { ToasterService } from '../../../core/services/toaster/toaster.service';
import { GstComponent } from '../../gst/gst.component';

@Component({
  selector: 'app-manage-invoices',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FormatDatePipe,
    GstComponent,
  ],
  templateUrl: './manage-invoices.component.html',
  styleUrl: './manage-invoices.component.scss',
})
export class ManageInvoicesComponent implements OnInit, OnDestroy {
  @ViewChild('companyDropdown', { static: false })
  companyDropdownRef!: ElementRef;

  private destroy$ = new Subject<void>();

  invoices: Invoice[] = [];
  selectedInvoice: Invoice | null = null;
  isLoading: boolean = false;

  invoiceQuery: InvoiceQuery = {
    fromDate: '',
    toDate: '',
    company: '',
    search: '',
    page: 1,
  };

  totalInvoices: number = 0;
  currentPage: number = 1;
  totalPages: number = 1;

  pageControl = new FormControl(1, { nonNullable: true });
  searchControl = new FormControl('', { nonNullable: true });

  companies: Company[] = [];
  filters: InvoiceFilters = { fromDate: '', toDate: '', company: '' };

  isFiltersCanvasOpen: boolean = false;
  showCompanyDropdown: boolean = false;

  showGstModal: boolean = true;

  constructor(
    private router: Router,
    private invoiceService: InvoiceService,
    private companyService: CompanyService,
    private toasterService: ToasterService
  ) {}

  ngOnInit(): void {
    this.getInvoices();
    this.setupControllers();
    this.getCompanies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInside = this.companyDropdownRef?.nativeElement.contains(
      event.target
    );
    if (!clickedInside) this.showCompanyDropdown = false;
  }

  setupControllers(): void {
    this.pageControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe((page) => {
        if (page) this.changePage(page);
      });

    this.searchControl.valueChanges
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.invoiceQuery.search = term;
        this.invoiceQuery.page = 1;
        this.getInvoices();
      });
  }

  createInvoice(): void {
    this.router.navigate(['/invoices/basic-details/create']);
  }

  getInvoices(): void {
    this.isLoading = true;

    this.invoiceService
      .getInvoices(this.invoiceQuery)
      .pipe(
        tap((res: InvoiceResponse) => {
          this.invoices = res.data;
          this.totalInvoices = res.total;
          this.currentPage = res.page;
          this.totalPages = res.totalPages;

          this.pageControl.setValue(this.currentPage, { emitEvent: false });
        }),
        catchError((err) => {
          console.error('Error fetching invoices: ', err);
          this.toasterService.toast('Error fetching invoices.');
          this.invoices = [];
          return of({
            data: [],
            total: 0,
            page: 1,
            totalPages: 1,
          } as InvoiceResponse);
        }),
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe();
  }

  getCompanies(): void {
    this.companyService
      .getCompanies()
      .pipe(
        tap((res: Company[]) => (this.companies = res)),
        catchError((err) => {
          console.error('Error fetching companies: ', err);
          this.toasterService.toast('Error fetching companies.');
          this.companies = [];
          return of([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      this.pageControl.setValue(this.currentPage, { emitEvent: false });
      return;
    }
    this.currentPage = page;
    this.invoiceQuery.page = page;
    this.getInvoices();
  }

  editInvoice(uuid: string): void {
    this.router.navigate(['/invoices/basic-details/', uuid]);
  }

  selectInvoice(id: string): void {
    this.invoiceService
      .getInvoice(id)
      .pipe(
        tap((res: Invoice) => (this.selectedInvoice = res)),
        catchError((err) => {
          console.error('Error fetching invoice: ', err);
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  deleteInvoice(uuid: string): void {
    this.invoiceService
      .deleteInvoice(uuid)
      .pipe(
        tap(() => {
          this.getInvoices();
          this.toasterService.toast('Invoice deleted successfully.');
        }),
        catchError((err) => {
          console.error('Error deleting invoice: ', err);
          this.toasterService.toast('Error deleting invoice.');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  viewInvoice(uuid: string): void {
    this.router.navigate(['/invoices/view-invoice/', uuid]);
  }

  applyFilters(): void {
    if (this.filters.fromDate && this.filters.toDate) {
      this.invoiceQuery.fromDate = this.formatDateForQuery(
        this.filters.fromDate
      );
      this.invoiceQuery.toDate = this.formatDateForQuery(this.filters.toDate);
    } else {
      delete this.invoiceQuery.fromDate;
      delete this.invoiceQuery.toDate;
    }

    if (this.filters.company) this.invoiceQuery.company = this.filters.company;
    else delete this.invoiceQuery.company;

    this.invoiceQuery.page = 1;
    this.getInvoices();
  }

  resetFilters(): void {
    this.filters = { fromDate: '', toDate: '', company: '' };
    this.invoiceQuery = { search: this.invoiceQuery.search || '', page: 1 };
    this.getInvoices();
  }

  private formatDateForQuery(dateStr: string): string {
    return dateStr ? new Date(dateStr).toISOString() : '';
  }
}
