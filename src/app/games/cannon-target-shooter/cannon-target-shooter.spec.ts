import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CannonTargetShooter } from './cannon-target-shooter';

describe('CannonTargetShooter', () => {
  let component: CannonTargetShooter;
  let fixture: ComponentFixture<CannonTargetShooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CannonTargetShooter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CannonTargetShooter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
