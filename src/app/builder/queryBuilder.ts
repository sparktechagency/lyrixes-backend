import { FilterQuery, Query } from "mongoose";

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, any>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, any>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }
  
    search(searchableFields: string[]) {
    const searchTerm = this?.query?.searchTerm;
    if (searchTerm) {
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map(
          (field) =>
            ({
              [field]: { $regex: searchTerm, $options: "i" },
            }) as FilterQuery<T>,
        ),
      });
    }

    return this;
  }

  // searchByTitle() {
  //   if (this.query.search) {
  //     this.modelQuery = this.modelQuery.find({
  //       title: { $regex: this.query.search, $options: "i" },
  //     } as FilterQuery<T>);
  //   }
  //   return this;
  // }
  searchByTitle() {
  if (this.query.search) {
    this.modelQuery = this.modelQuery.find({
      $text: { $search: this.query.search },
    } as FilterQuery<T>);
  }
  return this;
}


  // filter() {
  //   const queryObj = { ...this.query };
  //   const exclude = ["search", "page", "limit", "sort", "fields", "type"];

  //   exclude.forEach((key) => delete queryObj[key]);

  //   this.modelQuery = this.modelQuery.find(queryObj as FilterQuery<T>);
  //   return this;
  // }
  
  filter() {
  const queryObj = { ...this.query };
  const exclude = ["search", "page", "limit", "sort", "fields", "type"];

  exclude.forEach((key) => delete queryObj[key]);

  // ✅ support comma-separated status filter: status=OPEN,REQUESTED
  if (typeof queryObj.status === "string" && queryObj.status.includes(",")) {
    queryObj.status = { $in: queryObj.status.split(",").map((s: string) => s.trim()) };
  }

  this.modelQuery = this.modelQuery.find(queryObj as FilterQuery<T>);
  return this;
}

  sort() {
    const sort =
      this.query.sort?.split(",").join(" ") || "-createdAt";
    this.modelQuery = this.modelQuery.sort(sort);
    return this;
  }
//=============== UI specific sorting ==================
   sortByUI() {
    if (this.query.sort === "amount") {
      this.modelQuery = this.modelQuery.sort({ totalAmount: -1 });
      return this;
    }

    if (this.query.sort === "status") {
      this.modelQuery = this.modelQuery.sort({ status: 1 });
      return this;
    }

    this.modelQuery = this.modelQuery.sort({ createdAt: -1 });
    return this;
  }

  // ================ UI specific sorting ==================


  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const skip = (page - 1) * limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);
    return this;
  }

  fields() {
    const fields =
      this.query.fields?.split(",").join(" ") || "-__v";
    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }

  async countTotal() {
    const filter = this.modelQuery.getFilter();
    const total = await this.modelQuery.model.countDocuments(filter);
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;

    return {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    };
  }
}

export default QueryBuilder;
