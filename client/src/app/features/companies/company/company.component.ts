import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InputComponent } from '../../../shared/input/input.component';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../../core/services/company/company.service';
import { Company } from '../../../models/company.model';
import { Subject, tap, switchMap, catchError, of, takeUntil } from 'rxjs';
import { ToasterService } from '../../../core/services/toaster/toaster.service';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent],
  templateUrl: './company.component.html',
  styleUrl: './company.component.scss',
})
export class CompanyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  company!: Company;
  companyId: string = '';
  companyForm!: FormGroup;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private companyService: CompanyService,
    private toasterService: ToasterService
  ) {}

  ngOnInit(): void {
    this.initForm();

    this.route.params
      .pipe(
        tap(({ uuid }) => (this.companyId = uuid)),
        switchMap(({ uuid }) => {
          if (uuid !== 'create') {
            return this.companyService.getCompany(uuid).pipe(
              tap((res) => {
                this.company = res;
                this.companyForm.patchValue(res);
              }),
              catchError((err) => {
                console.error('Error: ', err);
                this.toasterService.toast('Error fetching company.');
                this.router.navigate(['/companies']);
                return of(null);
              })
            );
          }
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.companyForm = this.formBuilder.group({
      company_name: [null, Validators.required],
      company_address: [null, Validators.required],
      company_gst_no: [null, Validators.required],
    });
  }

  getControl(controlName: string): FormControl {
    return this.companyForm.get(controlName) as FormControl;
  }

  createCompany(): void {
    if (this.companyForm.invalid) return;

    const company = {
      company_name: this.companyForm.value.company_name.toUpperCase(),
      company_address: this.companyForm.value.company_address.toUpperCase(),
      company_gst_no: this.companyForm.value.company_gst_no.toUpperCase(),
    };

    this.companyService
      .createCompany(company as Company)
      .pipe(
        tap(() => {
          this.router.navigate(['/companies']);
          this.toasterService.toast('Company created successfully.');
        }),
        catchError((err) => {
          console.error('Error: ', err);
          this.toasterService.toast('Error creating company.');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  updateCompany(): void {
    if (this.companyForm.invalid) return;

    const company = {
      company_name: this.companyForm.value.company_name.toUpperCase(),
      company_address: this.companyForm.value.company_address.toUpperCase(),
      company_gst_no: this.companyForm.value.company_gst_no.toUpperCase(),
    };

    this.companyService
      .updateCompany(this.companyId, company as Company)
      .pipe(
        tap(() => {
          this.router.navigate(['/companies']);
          this.toasterService.toast('Company updated successfully.');
        }),
        catchError((err) => {
          console.error('Error: ', err);
          this.toasterService.toast('Error updating company.');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  deleteCompany(): void {
    this.companyService
      .deleteCompany(this.companyId)
      .pipe(
        tap(() => {
          this.router.navigate(['/companies']);
          this.toasterService.toast('Company deleted successfully.');
        }),
        catchError((err) => {
          console.error('Error: ', err);
          this.toasterService.toast('Error deleting company.');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  navigateToCompanies(): void {
    this.router.navigate(['/companies']);
  }
}
