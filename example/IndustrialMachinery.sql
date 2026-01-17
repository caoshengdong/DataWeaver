/* ------------------------------------------------------------
   Demo MySQL Dataset for Equipment Manufacturing Company
   Company (fictional): 星岳智能装备（上海）有限公司
   Domain: Industrial machinery / automation equipment manufacturer
   ------------------------------------------------------------ */

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS xingyue_equipment_mfg;
CREATE DATABASE xingyue_equipment_mfg
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE xingyue_equipment_mfg;

-- ---------------------------
-- 1) Master data tables
-- ---------------------------

DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
                           customer_id INT PRIMARY KEY AUTO_INCREMENT,
                           customer_code VARCHAR(20) NOT NULL UNIQUE,
                           customer_name VARCHAR(200) NOT NULL,
                           industry VARCHAR(100) NOT NULL,
                           region VARCHAR(100) NOT NULL,
                           credit_rating ENUM('A','B','C') NOT NULL DEFAULT 'B',
                           status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
                           created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

DROP TABLE IF EXISTS suppliers;
CREATE TABLE suppliers (
                           supplier_id INT PRIMARY KEY AUTO_INCREMENT,
                           supplier_code VARCHAR(20) NOT NULL UNIQUE,
                           supplier_name VARCHAR(200) NOT NULL,
                           category ENUM('MECHANICAL','ELECTRICAL','RAW_MATERIAL','OUTSOURCING','LOGISTICS') NOT NULL,
                           region VARCHAR(100) NOT NULL,
                           lead_time_days INT NOT NULL DEFAULT 7,
                           quality_rating ENUM('A','B','C') NOT NULL DEFAULT 'B',
                           status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
                           created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

DROP TABLE IF EXISTS warehouses;
CREATE TABLE warehouses (
                            warehouse_id INT PRIMARY KEY AUTO_INCREMENT,
                            warehouse_code VARCHAR(20) NOT NULL UNIQUE,
                            warehouse_name VARCHAR(100) NOT NULL,
                            location VARCHAR(200) NOT NULL
) ENGINE=InnoDB;

DROP TABLE IF EXISTS machines;
CREATE TABLE machines (
                          machine_id INT PRIMARY KEY AUTO_INCREMENT,
                          machine_code VARCHAR(30) NOT NULL UNIQUE,
                          machine_name VARCHAR(120) NOT NULL,
                          machine_type ENUM('CNC','LASER','PRESS','WELDING','ASSEMBLY_LINE','PAINT','TEST') NOT NULL,
                          status ENUM('RUNNING','IDLE','MAINTENANCE','DOWN') NOT NULL DEFAULT 'IDLE',
                          purchased_on DATE NULL,
                          last_maintained_on DATE NULL
) ENGINE=InnoDB;

DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
                           employee_id INT PRIMARY KEY AUTO_INCREMENT,
                           employee_code VARCHAR(20) NOT NULL UNIQUE,
                           full_name VARCHAR(100) NOT NULL,
                           dept ENUM('SALES','PROCUREMENT','PRODUCTION','QUALITY','WAREHOUSE','ENGINEERING','FINANCE') NOT NULL,
                           role VARCHAR(100) NOT NULL,
                           hire_date DATE NOT NULL,
                           status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB;

-- ---------------------------
-- 2) Product + Parts + BOM
-- ---------------------------

DROP TABLE IF EXISTS products;
CREATE TABLE products (
                          product_id INT PRIMARY KEY AUTO_INCREMENT,
                          sku VARCHAR(30) NOT NULL UNIQUE,
                          product_name VARCHAR(200) NOT NULL,
                          product_family ENUM('PACKAGING','AUTOMATION','TESTING','ROBOTICS') NOT NULL,
                          uom ENUM('SET','PCS') NOT NULL DEFAULT 'SET',
                          standard_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
                          list_price DECIMAL(12,2) NOT NULL DEFAULT 0,
                          lead_time_days INT NOT NULL DEFAULT 30,
                          status ENUM('ACTIVE','EOL') NOT NULL DEFAULT 'ACTIVE',
                          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

DROP TABLE IF EXISTS parts;
CREATE TABLE parts (
                       part_id INT PRIMARY KEY AUTO_INCREMENT,
                       part_code VARCHAR(30) NOT NULL UNIQUE,
                       part_name VARCHAR(200) NOT NULL,
                       part_type ENUM('RAW','PURCHASED','SUBASSEMBLY') NOT NULL,
                       uom ENUM('PCS','KG','M') NOT NULL DEFAULT 'PCS',
                       standard_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
                       default_supplier_id INT NULL,
                       status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
                       CONSTRAINT fk_parts_supplier
                           FOREIGN KEY (default_supplier_id) REFERENCES suppliers(supplier_id)
                               ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

DROP TABLE IF EXISTS bill_of_materials;
CREATE TABLE bill_of_materials (
                                   bom_id INT PRIMARY KEY AUTO_INCREMENT,
                                   product_id INT NOT NULL,
                                   part_id INT NOT NULL,
                                   qty_per DECIMAL(12,4) NOT NULL,
                                   scrap_rate DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
                                   effective_from DATE NOT NULL,
                                   effective_to DATE NULL,
                                   UNIQUE KEY uq_bom (product_id, part_id, effective_from),
                                   CONSTRAINT fk_bom_product
                                       FOREIGN KEY (product_id) REFERENCES products(product_id)
                                           ON UPDATE CASCADE ON DELETE CASCADE,
                                   CONSTRAINT fk_bom_part
                                       FOREIGN KEY (part_id) REFERENCES parts(part_id)
                                           ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------
-- 3) Inventory
-- ---------------------------

DROP TABLE IF EXISTS inventory;
CREATE TABLE inventory (
                           inventory_id INT PRIMARY KEY AUTO_INCREMENT,
                           warehouse_id INT NOT NULL,
                           part_id INT NOT NULL,
                           on_hand DECIMAL(14,3) NOT NULL DEFAULT 0,
                           reserved DECIMAL(14,3) NOT NULL DEFAULT 0,
                           reorder_point DECIMAL(14,3) NOT NULL DEFAULT 0,
                           updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                           UNIQUE KEY uq_inventory (warehouse_id, part_id),
                           CONSTRAINT fk_inv_wh
                               FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)
                                   ON UPDATE CASCADE ON DELETE RESTRICT,
                           CONSTRAINT fk_inv_part
                               FOREIGN KEY (part_id) REFERENCES parts(part_id)
                                   ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------
-- 4) Procurement: PO + Lines
-- ---------------------------

DROP TABLE IF EXISTS purchase_orders;
CREATE TABLE purchase_orders (
                                 po_id INT PRIMARY KEY AUTO_INCREMENT,
                                 po_number VARCHAR(30) NOT NULL UNIQUE,
                                 supplier_id INT NOT NULL,
                                 ordered_by INT NOT NULL,
                                 po_date DATE NOT NULL,
                                 expected_date DATE NULL,
                                 status ENUM('DRAFT','APPROVED','PARTIAL_RECEIVED','RECEIVED','CLOSED','CANCELLED') NOT NULL DEFAULT 'APPROVED',
                                 currency CHAR(3) NOT NULL DEFAULT 'CNY',
                                 CONSTRAINT fk_po_supplier
                                     FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
                                         ON UPDATE CASCADE ON DELETE RESTRICT,
                                 CONSTRAINT fk_po_employee
                                     FOREIGN KEY (ordered_by) REFERENCES employees(employee_id)
                                         ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

DROP TABLE IF EXISTS purchase_order_lines;
CREATE TABLE purchase_order_lines (
                                      po_line_id INT PRIMARY KEY AUTO_INCREMENT,
                                      po_id INT NOT NULL,
                                      line_no INT NOT NULL,
                                      part_id INT NOT NULL,
                                      qty_ordered DECIMAL(14,3) NOT NULL,
                                      unit_price DECIMAL(12,2) NOT NULL,
                                      qty_received DECIMAL(14,3) NOT NULL DEFAULT 0,
                                      UNIQUE KEY uq_pol (po_id, line_no),
                                      CONSTRAINT fk_pol_po
                                          FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id)
                                              ON UPDATE CASCADE ON DELETE CASCADE,
                                      CONSTRAINT fk_pol_part
                                          FOREIGN KEY (part_id) REFERENCES parts(part_id)
                                              ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------
-- 5) Sales: Orders + Lines
-- ---------------------------

DROP TABLE IF EXISTS sales_orders;
CREATE TABLE sales_orders (
                              so_id INT PRIMARY KEY AUTO_INCREMENT,
                              so_number VARCHAR(30) NOT NULL UNIQUE,
                              customer_id INT NOT NULL,
                              sales_rep_id INT NOT NULL,
                              order_date DATE NOT NULL,
                              promised_date DATE NULL,
                              status ENUM('NEW','CONFIRMED','IN_PRODUCTION','SHIPPED','CLOSED','CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
                              payment_terms VARCHAR(50) NOT NULL DEFAULT 'NET30',
                              CONSTRAINT fk_so_customer
                                  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
                                      ON UPDATE CASCADE ON DELETE RESTRICT,
                              CONSTRAINT fk_so_salesrep
                                  FOREIGN KEY (sales_rep_id) REFERENCES employees(employee_id)
                                      ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

DROP TABLE IF EXISTS sales_order_lines;
CREATE TABLE sales_order_lines (
                                   so_line_id INT PRIMARY KEY AUTO_INCREMENT,
                                   so_id INT NOT NULL,
                                   line_no INT NOT NULL,
                                   product_id INT NOT NULL,
                                   qty DECIMAL(14,3) NOT NULL,
                                   unit_price DECIMAL(12,2) NOT NULL,
                                   status ENUM('OPEN','ALLOCATED','FULFILLED','CANCELLED') NOT NULL DEFAULT 'OPEN',
                                   UNIQUE KEY uq_sol (so_id, line_no),
                                   CONSTRAINT fk_sol_so
                                       FOREIGN KEY (so_id) REFERENCES sales_orders(so_id)
                                           ON UPDATE CASCADE ON DELETE CASCADE,
                                   CONSTRAINT fk_sol_product
                                       FOREIGN KEY (product_id) REFERENCES products(product_id)
                                           ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------
-- 6) Production: Work Orders + Ops
-- ---------------------------

DROP TABLE IF EXISTS work_orders;
CREATE TABLE work_orders (
                             wo_id INT PRIMARY KEY AUTO_INCREMENT,
                             wo_number VARCHAR(30) NOT NULL UNIQUE,
                             product_id INT NOT NULL,
                             so_id INT NULL,
                             qty_planned DECIMAL(14,3) NOT NULL,
                             qty_completed DECIMAL(14,3) NOT NULL DEFAULT 0,
                             start_date DATE NULL,
                             due_date DATE NULL,
                             status ENUM('PLANNED','RELEASED','IN_PROCESS','COMPLETED','CLOSED','CANCELLED') NOT NULL DEFAULT 'RELEASED',
                             created_by INT NOT NULL,
                             CONSTRAINT fk_wo_product
                                 FOREIGN KEY (product_id) REFERENCES products(product_id)
                                     ON UPDATE CASCADE ON DELETE RESTRICT,
                             CONSTRAINT fk_wo_so
                                 FOREIGN KEY (so_id) REFERENCES sales_orders(so_id)
                                     ON UPDATE CASCADE ON DELETE SET NULL,
                             CONSTRAINT fk_wo_emp
                                 FOREIGN KEY (created_by) REFERENCES employees(employee_id)
                                     ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

DROP TABLE IF EXISTS work_order_operations;
CREATE TABLE work_order_operations (
                                       op_id INT PRIMARY KEY AUTO_INCREMENT,
                                       wo_id INT NOT NULL,
                                       op_seq INT NOT NULL,
                                       op_name VARCHAR(120) NOT NULL,
                                       machine_id INT NULL,
                                       planned_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
                                       actual_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
                                       status ENUM('PENDING','RUNNING','DONE','HOLD') NOT NULL DEFAULT 'PENDING',
                                       UNIQUE KEY uq_wo_op (wo_id, op_seq),
                                       CONSTRAINT fk_op_wo
                                           FOREIGN KEY (wo_id) REFERENCES work_orders(wo_id)
                                               ON UPDATE CASCADE ON DELETE CASCADE,
                                       CONSTRAINT fk_op_machine
                                           FOREIGN KEY (machine_id) REFERENCES machines(machine_id)
                                               ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------
-- 7) Quality: Inspections
-- ---------------------------

DROP TABLE IF EXISTS quality_inspections;
CREATE TABLE quality_inspections (
                                     inspection_id INT PRIMARY KEY AUTO_INCREMENT,
                                     inspection_number VARCHAR(30) NOT NULL UNIQUE,
                                     inspection_type ENUM('INCOMING','IN_PROCESS','FINAL') NOT NULL,
                                     related_po_id INT NULL,
                                     related_wo_id INT NULL,
                                     inspected_part_id INT NULL,
                                     inspected_product_id INT NULL,
                                     inspector_id INT NOT NULL,
                                     inspection_date DATE NOT NULL,
                                     result ENUM('PASS','FAIL','CONDITIONAL') NOT NULL,
                                     defect_code VARCHAR(40) NULL,
                                     notes VARCHAR(500) NULL,
                                     CONSTRAINT fk_qi_po
                                         FOREIGN KEY (related_po_id) REFERENCES purchase_orders(po_id)
                                             ON UPDATE CASCADE ON DELETE SET NULL,
                                     CONSTRAINT fk_qi_wo
                                         FOREIGN KEY (related_wo_id) REFERENCES work_orders(wo_id)
                                             ON UPDATE CASCADE ON DELETE SET NULL,
                                     CONSTRAINT fk_qi_part
                                         FOREIGN KEY (inspected_part_id) REFERENCES parts(part_id)
                                             ON UPDATE CASCADE ON DELETE SET NULL,
                                     CONSTRAINT fk_qi_product
                                         FOREIGN KEY (inspected_product_id) REFERENCES products(product_id)
                                             ON UPDATE CASCADE ON DELETE SET NULL,
                                     CONSTRAINT fk_qi_inspector
                                         FOREIGN KEY (inspector_id) REFERENCES employees(employee_id)
                                             ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------
-- 8) Logistics: Shipments
-- ---------------------------

DROP TABLE IF EXISTS shipments;
CREATE TABLE shipments (
                           shipment_id INT PRIMARY KEY AUTO_INCREMENT,
                           shipment_number VARCHAR(30) NOT NULL UNIQUE,
                           so_id INT NOT NULL,
                           warehouse_id INT NOT NULL,
                           shipped_date DATE NOT NULL,
                           carrier VARCHAR(80) NOT NULL,
                           tracking_no VARCHAR(60) NULL,
                           status ENUM('CREATED','IN_TRANSIT','DELIVERED','EXCEPTION') NOT NULL DEFAULT 'IN_TRANSIT',
                           CONSTRAINT fk_ship_so
                               FOREIGN KEY (so_id) REFERENCES sales_orders(so_id)
                                   ON UPDATE CASCADE ON DELETE RESTRICT,
                           CONSTRAINT fk_ship_wh
                               FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)
                                   ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Seed data
-- ============================================================

-- Customers (10)
INSERT INTO customers (customer_code, customer_name, industry, region, credit_rating, status) VALUES
                                                                                                  ('CUST-1001','华东智造汽车零部件有限公司','Automotive','Shanghai','A','ACTIVE'),
                                                                                                  ('CUST-1002','苏州新能电池系统股份有限公司','New Energy','Jiangsu','A','ACTIVE'),
                                                                                                  ('CUST-1003','浙江精密电子制造有限公司','Electronics','Zhejiang','B','ACTIVE'),
                                                                                                  ('CUST-1004','宁波港航装备运营中心','Logistics','Zhejiang','B','ACTIVE'),
                                                                                                  ('CUST-1005','中原医药包装科技有限公司','Pharma Packaging','Henan','B','ACTIVE'),
                                                                                                  ('CUST-1006','西南重工工程机械有限公司','Heavy Machinery','Sichuan','C','ACTIVE'),
                                                                                                  ('CUST-1007','京津自动化集成有限公司','Automation Integrator','Beijing','A','ACTIVE'),
                                                                                                  ('CUST-1008','青岛海工装备制造有限公司','Marine Engineering','Shandong','B','ACTIVE'),
                                                                                                  ('CUST-1009','合肥光伏组件制造基地','PV Manufacturing','Anhui','B','ACTIVE'),
                                                                                                  ('CUST-1010','厦门食品包装生产集团','Food Packaging','Fujian','B','ACTIVE');

-- Suppliers (10)
INSERT INTO suppliers (supplier_code, supplier_name, category, region, lead_time_days, quality_rating, status) VALUES
                                                                                                                   ('SUP-2001','昆山精密机加有限公司','MECHANICAL','Jiangsu',10,'A','ACTIVE'),
                                                                                                                   ('SUP-2002','上海电控元器件有限公司','ELECTRICAL','Shanghai',14,'A','ACTIVE'),
                                                                                                                   ('SUP-2003','无锡轴承与传动有限公司','MECHANICAL','Jiangsu',12,'B','ACTIVE'),
                                                                                                                   ('SUP-2004','宁波铝材供应链有限公司','RAW_MATERIAL','Zhejiang',7,'B','ACTIVE'),
                                                                                                                   ('SUP-2005','杭州工业传感器有限公司','ELECTRICAL','Zhejiang',21,'A','ACTIVE'),
                                                                                                                   ('SUP-2006','常州工业机器人集成件厂','OUTSOURCING','Jiangsu',18,'B','ACTIVE'),
                                                                                                                   ('SUP-2007','嘉兴包装材料有限公司','RAW_MATERIAL','Zhejiang',6,'B','ACTIVE'),
                                                                                                                   ('SUP-2008','上海专业物流有限公司','LOGISTICS','Shanghai',3,'B','ACTIVE'),
                                                                                                                   ('SUP-2009','南京液压与气动系统有限公司','MECHANICAL','Jiangsu',15,'B','ACTIVE'),
                                                                                                                   ('SUP-2010','深圳工业视觉组件有限公司','ELECTRICAL','Guangdong',20,'A','ACTIVE');

-- Warehouses (3)
INSERT INTO warehouses (warehouse_code, warehouse_name, location) VALUES
                                                                      ('WH-SH-01','上海总仓','上海市浦东新区临港片区'),
                                                                      ('WH-SZ-01','苏州零部件仓','苏州市工业园区'),
                                                                      ('WH-NB-01','宁波项目仓','宁波市北仑区');

-- Machines (8)
INSERT INTO machines (machine_code, machine_name, machine_type, status, purchased_on, last_maintained_on) VALUES
                                                                                                              ('MC-CNC-01','立式加工中心 VMC-850','CNC','RUNNING','2021-06-15','2025-12-20'),
                                                                                                              ('MC-CNC-02','卧式加工中心 HMC-630','CNC','IDLE','2022-03-10','2025-11-28'),
                                                                                                              ('MC-LAS-01','光纤激光切割机 3kW','LASER','RUNNING','2020-09-01','2025-12-05'),
                                                                                                              ('MC-WLD-01','机器人焊接工作站 A','WELDING','IDLE','2023-02-12','2025-10-30'),
                                                                                                              ('MC-PRS-01','液压折弯机 160T','PRESS','MAINTENANCE','2019-05-20','2025-12-29'),
                                                                                                              ('MC-ASSY-01','装配线 1号','ASSEMBLY_LINE','RUNNING','2022-08-18','2025-12-15'),
                                                                                                              ('MC-PNT-01','喷涂房 1号','PAINT','IDLE','2021-11-07','2025-11-25'),
                                                                                                              ('MC-TST-01','整机功能测试台','TEST','RUNNING','2023-06-30','2025-12-22');

-- Employees (12)
INSERT INTO employees (employee_code, full_name, dept, role, hire_date, status) VALUES
                                                                                    ('EMP-3001','张明','SALES','Key Account Manager','2021-04-01','ACTIVE'),
                                                                                    ('EMP-3002','李倩','SALES','Sales Engineer','2022-07-15','ACTIVE'),
                                                                                    ('EMP-3003','王强','PROCUREMENT','Procurement Specialist','2020-02-10','ACTIVE'),
                                                                                    ('EMP-3004','赵磊','PROCUREMENT','Supplier Manager','2019-09-09','ACTIVE'),
                                                                                    ('EMP-3005','陈琳','PRODUCTION','Production Planner','2021-10-20','ACTIVE'),
                                                                                    ('EMP-3006','孙浩','PRODUCTION','Workshop Supervisor','2018-03-12','ACTIVE'),
                                                                                    ('EMP-3007','周婷','QUALITY','Quality Engineer','2020-06-25','ACTIVE'),
                                                                                    ('EMP-3008','顾晨','QUALITY','Inspector','2023-01-05','ACTIVE'),
                                                                                    ('EMP-3009','何伟','WAREHOUSE','Warehouse Lead','2019-12-01','ACTIVE'),
                                                                                    ('EMP-3010','林雪','ENGINEERING','Mechanical Engineer','2022-02-14','ACTIVE'),
                                                                                    ('EMP-3011','沈洋','ENGINEERING','Electrical Engineer','2021-08-09','ACTIVE'),
                                                                                    ('EMP-3012','高峰','FINANCE','Cost Accountant','2020-11-11','ACTIVE');

-- Products (6)
INSERT INTO products (sku, product_name, product_family, uom, standard_cost, list_price, lead_time_days, status) VALUES
                                                                                                                     ('PRD-AX100','AX100 高速装箱机','PACKAGING','SET',420000.00,560000.00,45,'ACTIVE'),
                                                                                                                     ('PRD-AX200','AX200 高速开箱封箱一体机','PACKAGING','SET',520000.00,690000.00,60,'ACTIVE'),
                                                                                                                     ('PRD-RB50','RB50 协作机器人上料单元','ROBOTICS','SET',180000.00,260000.00,35,'ACTIVE'),
                                                                                                                     ('PRD-FT10','FT10 扭矩与力传感测试台','TESTING','SET',230000.00,320000.00,40,'ACTIVE'),
                                                                                                                     ('PRD-LN20','LN20 产线视觉检测模组','AUTOMATION','SET',90000.00,145000.00,25,'ACTIVE'),
                                                                                                                     ('PRD-AGV01','AGV01 轻载搬运车','ROBOTICS','SET',150000.00,220000.00,30,'ACTIVE');

-- Parts (18)
INSERT INTO parts (part_code, part_name, part_type, uom, standard_cost, default_supplier_id, status) VALUES
                                                                                                         ('PT-4001','铝型材框架 40x40','RAW','M',85.00,4,'ACTIVE'),
                                                                                                         ('PT-4002','碳钢板 Q235 3mm','RAW','KG',6.50,4,'ACTIVE'),
                                                                                                         ('PT-4003','直线导轨 20mm','PURCHASED','M',260.00,1,'ACTIVE'),
                                                                                                         ('PT-4004','滚珠丝杠 25mm','PURCHASED','PCS',980.00,1,'ACTIVE'),
                                                                                                         ('PT-4005','伺服电机 750W','PURCHASED','PCS',1850.00,2,'ACTIVE'),
                                                                                                         ('PT-4006','伺服驱动器 750W','PURCHASED','PCS',2100.00,2,'ACTIVE'),
                                                                                                         ('PT-4007','工业相机 500万像素','PURCHASED','PCS',1650.00,10,'ACTIVE'),
                                                                                                         ('PT-4008','镜头 16mm','PURCHASED','PCS',520.00,10,'ACTIVE'),
                                                                                                         ('PT-4009','光电传感器 M18','PURCHASED','PCS',180.00,5,'ACTIVE'),
                                                                                                         ('PT-4010','PLC 主站','PURCHASED','PCS',6200.00,2,'ACTIVE'),
                                                                                                         ('PT-4011','触摸屏 HMI 10寸','PURCHASED','PCS',3200.00,2,'ACTIVE'),
                                                                                                         ('PT-4012','轴承 6205','PURCHASED','PCS',22.00,3,'ACTIVE'),
                                                                                                         ('PT-4013','气动三联件','PURCHASED','PCS',260.00,9,'ACTIVE'),
                                                                                                         ('PT-4014','气缸 32x100','PURCHASED','PCS',190.00,9,'ACTIVE'),
                                                                                                         ('PT-4015','电控柜钣金件（外协）','SUBASSEMBLY','PCS',3800.00,6,'ACTIVE'),
                                                                                                         ('PT-4016','输送带组件','SUBASSEMBLY','PCS',6800.00,1,'ACTIVE'),
                                                                                                         ('PT-4017','包装薄膜（PE）','RAW','KG',12.50,7,'ACTIVE'),
                                                                                                         ('PT-4018','紧固件套装 M3-M12','PURCHASED','PCS',450.00,1,'ACTIVE');

-- BOM (for 4 products, enough to simulate)
-- PRD-AX100 (product_id assumed 1), PRD-AX200 (2), PRD-RB50 (3), PRD-LN20 (5)
INSERT INTO bill_of_materials (product_id, part_id, qty_per, scrap_rate, effective_from, effective_to) VALUES
-- AX100
(1, 1, 120.0000, 0.0200, '2025-01-01', NULL),  -- aluminum profile
(1, 2, 850.0000, 0.0300, '2025-01-01', NULL),  -- steel plate
(1, 3, 18.0000, 0.0100, '2025-01-01', NULL),
(1, 4, 6.0000, 0.0100, '2025-01-01', NULL),
(1, 5, 8.0000, 0.0050, '2025-01-01', NULL),
(1, 6, 8.0000, 0.0050, '2025-01-01', NULL),
(1,10, 1.0000, 0.0000, '2025-01-01', NULL),
(1,11, 1.0000, 0.0000, '2025-01-01', NULL),
(1,15, 1.0000, 0.0000, '2025-01-01', NULL),
(1,16, 2.0000, 0.0000, '2025-01-01', NULL),
(1,18, 6.0000, 0.0000, '2025-01-01', NULL),
-- AX200
(2, 1, 150.0000, 0.0200, '2025-01-01', NULL),
(2, 2, 980.0000, 0.0300, '2025-01-01', NULL),
(2, 3, 22.0000, 0.0100, '2025-01-01', NULL),
(2, 4, 8.0000, 0.0100, '2025-01-01', NULL),
(2, 5, 10.0000,0.0050, '2025-01-01', NULL),
(2, 6, 10.0000,0.0050, '2025-01-01', NULL),
(2,10, 1.0000, 0.0000, '2025-01-01', NULL),
(2,11, 1.0000, 0.0000, '2025-01-01', NULL),
(2,15, 1.0000, 0.0000, '2025-01-01', NULL),
(2,16, 3.0000, 0.0000, '2025-01-01', NULL),
(2,18, 8.0000, 0.0000, '2025-01-01', NULL),
-- RB50
(3, 1, 45.0000, 0.0200, '2025-01-01', NULL),
(3, 3, 6.0000, 0.0100, '2025-01-01', NULL),
(3, 5, 2.0000, 0.0050, '2025-01-01', NULL),
(3, 6, 2.0000, 0.0050, '2025-01-01', NULL),
(3, 9, 6.0000, 0.0000, '2025-01-01', NULL),
(3,10, 1.0000, 0.0000, '2025-01-01', NULL),
(3,11, 1.0000, 0.0000, '2025-01-01', NULL),
(3,18, 2.0000, 0.0000, '2025-01-01', NULL),
-- LN20
(5, 7, 2.0000, 0.0050, '2025-01-01', NULL),
(5, 8, 2.0000, 0.0050, '2025-01-01', NULL),
(5, 9, 4.0000, 0.0000, '2025-01-01', NULL),
(5,10, 1.0000, 0.0000, '2025-01-01', NULL),
(5,11, 1.0000, 0.0000, '2025-01-01', NULL),
(5,15, 1.0000, 0.0000, '2025-01-01', NULL),
(5,18, 1.0000, 0.0000, '2025-01-01', NULL);

-- Inventory (warehouse x parts)
INSERT INTO inventory (warehouse_id, part_id, on_hand, reserved, reorder_point) VALUES
-- WH-SH-01
(1, 1, 1800.000, 120.000, 400.000),
(1, 2, 25000.000, 1200.000, 5000.000),
(1, 3, 220.000,  20.000,  60.000),
(1, 4,  65.000,   5.000,  15.000),
(1, 5,  48.000,   6.000,  12.000),
(1, 6,  52.000,   6.000,  12.000),
(1,10,  18.000,   2.000,   4.000),
(1,11,  22.000,   2.000,   5.000),
(1,15,  10.000,   1.000,   2.000),
(1,16,  14.000,   2.000,   4.000),
(1,18, 120.000,  10.000,  30.000),
-- WH-SZ-01
(2, 1, 1200.000,  80.000, 300.000),
(2, 3, 140.000,   0.000,  50.000),
(2, 5,  26.000,   2.000,  10.000),
(2, 7,  40.000,   4.000,  10.000),
(2, 8,  40.000,   4.000,  10.000),
(2, 9, 260.000,  20.000,  80.000),
(2,12, 600.000,  50.000, 150.000),
(2,13,  60.000,   6.000,  15.000),
(2,14,  90.000,  10.000,  20.000),
-- WH-NB-01
(3, 2, 12000.000, 0.000,  3000.000),
(3,16,     6.000, 0.000,     2.000),
(3,17,  2800.000, 0.000,   800.000);

-- Purchase Orders (6)
-- ordered_by uses EMP-3003 (id 3) / EMP-3004 (id 4)
INSERT INTO purchase_orders (po_number, supplier_id, ordered_by, po_date, expected_date, status, currency) VALUES
                                                                                                               ('PO-2025-1201', 1, 3, '2025-12-02', '2025-12-15', 'RECEIVED', 'CNY'),
                                                                                                               ('PO-2025-1202', 2, 4, '2025-12-05', '2025-12-22', 'PARTIAL_RECEIVED', 'CNY'),
                                                                                                               ('PO-2025-1203', 4, 3, '2025-12-10', '2025-12-17', 'RECEIVED', 'CNY'),
                                                                                                               ('PO-2025-1204',10, 4, '2025-12-12', '2026-01-05', 'APPROVED', 'CNY'),
                                                                                                               ('PO-2026-0101', 9, 3, '2026-01-03', '2026-01-18', 'APPROVED', 'CNY'),
                                                                                                               ('PO-2026-0102', 7, 4, '2026-01-06', '2026-01-14', 'RECEIVED', 'CNY');

-- PO Lines (14)
INSERT INTO purchase_order_lines (po_id, line_no, part_id, qty_ordered, unit_price, qty_received) VALUES
-- PO-2025-1201 (po_id 1)
(1, 1, 3,  80.000, 255.00,  80.000),
(1, 2, 4,  20.000, 960.00,  20.000),
(1, 3,18,  50.000, 430.00,  50.000),
-- PO-2025-1202 (po_id 2)
(2, 1,10,   6.000, 6100.00, 2.000),
(2, 2,11,   8.000, 3100.00, 4.000),
(2, 3, 5,  20.000, 1780.00, 10.000),
(2, 4, 6,  20.000, 2050.00, 10.000),
-- PO-2025-1203 (po_id 3)
(3, 1, 1, 600.000,   82.00, 600.000),
(3, 2, 2, 8000.000,   6.30, 8000.000),
-- PO-2025-1204 (po_id 4)
(4, 1, 7,  20.000, 1600.00, 0.000),
(4, 2, 8,  20.000,  500.00, 0.000),
-- PO-2026-0101 (po_id 5)
(5, 1,13,  30.000,  245.00, 0.000),
(5, 2,14,  50.000,  175.00, 0.000),
-- PO-2026-0102 (po_id 6)
(6, 1,17, 1200.000,  12.20, 1200.000);

-- Sales Orders (6)
-- sales_rep_id EMP-3001 (id 1) / EMP-3002 (id 2)
INSERT INTO sales_orders (so_number, customer_id, sales_rep_id, order_date, promised_date, status, payment_terms) VALUES
                                                                                                                      ('SO-2025-1108', 1, 1, '2025-11-08', '2026-01-10', 'IN_PRODUCTION', 'NET30'),
                                                                                                                      ('SO-2025-1120', 2, 1, '2025-11-20', '2026-01-20', 'CONFIRMED', 'NET45'),
                                                                                                                      ('SO-2025-1206', 5, 2, '2025-12-06', '2026-02-05', 'CONFIRMED', 'NET30'),
                                                                                                                      ('SO-2025-1218', 7, 2, '2025-12-18', '2026-01-25', 'IN_PRODUCTION', 'NET30'),
                                                                                                                      ('SO-2026-0105', 3, 1, '2026-01-05', '2026-02-15', 'NEW', 'NET30'),
                                                                                                                      ('SO-2025-1030',10, 2, '2025-10-30', '2025-12-28', 'SHIPPED', 'NET30');

-- Sales Order Lines (10)
INSERT INTO sales_order_lines (so_id, line_no, product_id, qty, unit_price, status) VALUES
-- SO-2025-1108 (so_id 1)
(1, 1, 1, 2.000, 545000.00, 'OPEN'),
(1, 2, 5, 4.000, 140000.00, 'OPEN'),
-- SO-2025-1120 (so_id 2)
(2, 1, 2, 1.000, 680000.00, 'OPEN'),
(2, 2, 3, 2.000, 255000.00, 'OPEN'),
-- SO-2025-1206 (so_id 3)
(3, 1, 1, 1.000, 555000.00, 'OPEN'),
-- SO-2025-1218 (so_id 4)
(4, 1, 3, 3.000, 258000.00, 'OPEN'),
(4, 2, 6, 2.000, 215000.00, 'OPEN'),
-- SO-2026-0105 (so_id 5)
(5, 1, 5, 6.000, 142000.00, 'OPEN'),
(5, 2, 4, 1.000, 318000.00, 'OPEN'),
-- SO-2025-1030 (so_id 6)
(6, 1, 1, 1.000, 548000.00, 'FULFILLED');

-- Work Orders (5) tied to sales orders
-- created_by EMP-3005 (id 5)
INSERT INTO work_orders (wo_number, product_id, so_id, qty_planned, qty_completed, start_date, due_date, status, created_by) VALUES
                                                                                                                                 ('WO-2025-1201', 1, 1, 1.000, 0.000, '2025-12-10', '2026-01-05', 'IN_PROCESS', 5),
                                                                                                                                 ('WO-2025-1202', 1, 1, 1.000, 0.000, '2025-12-15', '2026-01-08', 'RELEASED', 5),
                                                                                                                                 ('WO-2025-1210', 3, 2, 2.000, 1.000, '2025-12-20', '2026-01-12', 'IN_PROCESS', 5),
                                                                                                                                 ('WO-2025-1220', 3, 4, 3.000, 0.000, '2025-12-28', '2026-01-20', 'RELEASED', 5),
                                                                                                                                 ('WO-2025-1130', 1, 6, 1.000, 1.000, '2025-11-05', '2025-12-20', 'COMPLETED', 5);

-- Work Order Operations (typical routing)
INSERT INTO work_order_operations (wo_id, op_seq, op_name, machine_id, planned_hours, actual_hours, status) VALUES
-- WO-2025-1201
(1, 10, '下料与激光切割', 3, 24.00, 22.50, 'DONE'),
(1, 20, 'CNC 精加工',     1, 40.00, 38.20, 'DONE'),
(1, 30, '焊接与打磨',     4, 18.00,  0.00, 'PENDING'),
(1, 40, '装配',           6, 52.00,  0.00, 'PENDING'),
(1, 50, '整机测试',       8, 16.00,  0.00, 'PENDING'),
-- WO-2025-1202
(2, 10, '下料与激光切割', 3, 24.00,  0.00, 'PENDING'),
(2, 20, 'CNC 精加工',     2, 40.00,  0.00, 'PENDING'),
(2, 40, '装配',           6, 52.00,  0.00, 'PENDING'),
(2, 50, '整机测试',       8, 16.00,  0.00, 'PENDING'),
-- WO-2025-1210
(3, 10, '机加与部件准备', 1, 18.00, 16.50, 'DONE'),
(3, 20, '电气装配',       6, 20.00, 19.00, 'DONE'),
(3, 30, '功能测试',       8, 10.00,  9.50, 'DONE'),
-- WO-2025-1220
(4, 10, '机加与部件准备', 2, 22.00,  0.00, 'PENDING'),
(4, 20, '电气装配',       6, 30.00,  0.00, 'PENDING'),
(4, 30, '功能测试',       8, 12.00,  0.00, 'PENDING'),
-- WO-2025-1130
(5, 10, '下料与激光切割', 3, 24.00, 24.10, 'DONE'),
(5, 20, 'CNC 精加工',     1, 40.00, 41.20, 'DONE'),
(5, 40, '装配',           6, 52.00, 53.00, 'DONE'),
(5, 50, '整机测试',       8, 16.00, 15.60, 'DONE');

-- Quality Inspections (10)
-- inspector_id EMP-3008 (id 8) / EMP-3007 (id 7)
INSERT INTO quality_inspections (
    inspection_number,
    inspection_type,
    related_po_id,
    related_wo_id,
    inspected_part_id,
    inspected_product_id,
    inspector_id,
    inspection_date,
    result,
    defect_code,
    notes
) VALUES
-- 来料检验（IQC）
('IQ-2025-1201','INCOMING', 1, NULL,  3, NULL,  8, '2025-12-16', 'PASS',        NULL,          '直线导轨来料抽检合格'),
('IQ-2025-1202','INCOMING', 2, NULL, 10, NULL,  8, '2025-12-20', 'CONDITIONAL', 'ELEC-IO-01',  'PLC 外观轻微划痕，评审可用'),
('IQ-2025-1203','INCOMING', 3, NULL,  2, NULL,  8, '2025-12-18', 'PASS',        NULL,          '钢材材质证明齐全'),
('IQ-2025-1204','INCOMING', 6, NULL, 17, NULL,  7, '2025-12-22', 'FAIL',        'MECH-DIM-02', '伺服电机轴径尺寸超差'),

('IQ-2025-1205','INCOMING', 5, NULL, 12, NULL,  7, '2025-12-25', 'PASS',        NULL,          '液压阀功能测试正常'),

-- 过程检验（IPQC）
('IP-2026-0101','IN_PROCESS', NULL, 1, NULL, NULL,  9, '2026-01-05', 'PASS',        NULL,          '立柱加工尺寸稳定'),
('IP-2026-0102','IN_PROCESS', NULL, 2, NULL, NULL,  9, '2026-01-08', 'FAIL',        'PROC-VIB-01', '主轴加工振动超限'),
('IP-2026-0103','IN_PROCESS', NULL, 3, NULL, NULL,  9, '2026-01-10', 'PASS',        NULL,          '床身装配间隙合格'),
('IP-2026-0104','IN_PROCESS', NULL, 4, NULL, NULL, 10, '2026-01-12', 'CONDITIONAL', 'PROC-ALIGN-02','导轨平行度略超限，已现场调整'),

-- 出厂检验（FQC）
('FQ-2026-0201','FINAL', NULL, NULL, NULL, 1, 6, '2026-02-02', 'PASS',        NULL,          '整机精度、外观、噪音测试合格'),
('FQ-2026-0202','FINAL', NULL, NULL, NULL, 2, 6, '2026-02-05', 'PASS',        NULL,          '整机连续运行8小时稳定'),
('FQ-2026-0203','FINAL', NULL, NULL, NULL, 3, 6, '2026-02-08', 'FAIL',        'FQC-ACC-01',   '定位精度未达出厂标准'),
('FQ-2026-0204','FINAL', NULL, NULL, NULL, 4, 6, '2026-02-10', 'CONDITIONAL', 'FQC-NOISE-02', '高速运行噪音偏高，客户接受'),
('FQ-2026-0205','FINAL', NULL, NULL, NULL, 5, 6, '2026-02-12', 'PASS',        NULL,          '全项测试通过');

INSERT INTO shipments (
    shipment_number,
    so_id,
    warehouse_id,
    shipped_date,
    carrier,
    tracking_no,
    status
) VALUES
-- 标准整机发运
('SHP-2026-0001', 1, 1, '2026-02-15', '顺丰重货', 'SF-RT-98234123', 'DELIVERED'),
('SHP-2026-0002', 2, 1, '2026-02-18', '德邦物流', 'DB-HP-55672109', 'DELIVERED'),

-- 项目型分批交付
('SHP-2026-0003', 3, 2, '2026-02-20', '中铁物流', 'CRL-IND-774321', 'IN_TRANSIT'),
('SHP-2026-0004', 3, 2, '2026-02-25', '中铁物流', 'CRL-IND-774355', 'CREATED'),

-- 定制设备（质量让步后发运）
('SHP-2026-0005', 4, 1, '2026-02-22', '安能物流', 'ANEQ-88290123', 'DELIVERED'),

-- 发运异常示例（用于 AI / MCP 演示）
('SHP-2026-0006', 5, 1, '2026-02-28', '顺丰重货', 'SF-RT-99331221', 'EXCEPTION');